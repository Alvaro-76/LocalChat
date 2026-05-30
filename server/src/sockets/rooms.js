const crypto = require('crypto');
const rooms = new Map();

const MAX_DICE_COUNT = 100;

function isNPC(name) {
  return name && name.startsWith('NPC:');
}
const MAX_ROOM_NAME = 50;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_PLAYERS = 20;

const CARD_VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A','JOKER'];
const VALUE_RANK = Object.fromEntries(CARD_VALUES.map((v, i) => [v, i + 1]));
const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
const SUIT_RANK = { clubs: 1, diamonds: 2, hearts: 3, spades: 4 };

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of CARD_VALUES) {
      if (value === 'JOKER') continue;
      deck.push({ value, suit, rank: VALUE_RANK[value], suitRank: SUIT_RANK[suit] });
    }
  }
  deck.push({ value: 'JOKER', suit: null, rank: VALUE_RANK['JOKER'], suitRank: 0 });
  deck.push({ value: 'JOKER', suit: null, rank: VALUE_RANK['JOKER'], suitRank: 0 });
  return deck;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function compareCards(a, b) {
  if (a.rank !== b.rank) return b.rank - a.rank;
  return b.suitRank - a.suitRank;
}

function dealCards(room) {
  const init = room.initiative;
  if (init.deck.length === 0 || init.hadJoker) {
    init.deck = shuffle(createDeck());
    init.hadJoker = false;
  }
  init.round++;
  init.roundCards = {};
  init.chosenCards = {};
  init.picking = [];
  init.phase = 'dealing';

  for (const player of room.players) {
    const opts = init.playerOptions[player] || {};
    let cards = [];
    if (init.deck.length === 0) break;

    let mainCard = init.deck.pop();
    cards.push(mainCard);

    if (opts.rapido && mainCard.rank < VALUE_RANK['5']) {
      while (cards.length > 0 && cards[cards.length - 1].rank < VALUE_RANK['5'] && init.deck.length > 0) {
        cards.push(init.deck.pop());
      }
      cards = [cards[cards.length - 1]];
    }

    if (opts.dubitativo && init.deck.length > 0) cards.push(init.deck.pop());
    if (opts.temple && init.deck.length > 0) cards.push(init.deck.pop());
    if (opts.templeMejorado && init.deck.length > 0) cards.push(init.deck.pop());
    if (opts.templeMejorado && init.deck.length > 0) cards.push(init.deck.pop());
    if (opts.terrenoPredilecto && init.deck.length > 0) cards.push(init.deck.pop());

    init.roundCards[player] = cards;
  }

  for (const player of room.players) {
    const opts = init.playerOptions[player] || {};
    const cards = init.roundCards[player];
    if (!cards || cards.length === 0) continue;

    if (cards.length === 1) {
      init.chosenCards[player] = cards[0];
    } else if (opts.dubitativo) {
      const joker = cards.find(c => c.value === 'JOKER');
      if (joker) {
        init.chosenCards[player] = joker;
      } else {
        cards.sort(compareCards);
        init.chosenCards[player] = cards[cards.length - 1];
      }
    } else {
      init.picking.push(player);
    }
  }

  if (init.picking.length === 0) {
    finalizeInitiative(room);
  } else {
    init.phase = 'picking';
  }
}

function finalizeInitiative(room) {
  const init = room.initiative;
  const entries = [];
  for (const player of room.players) {
    const card = init.chosenCards[player];
    if (card) entries.push({ player, card });
  }
  entries.sort((a, b) => compareCards(a.card, b.card));
  init.order = entries;
  init.phase = 'done';
  init.hadJoker = entries.some(e => e.card.value === 'JOKER');
  init.currentOrderIdx = 0;
  init.roundActive = true;
  if (entries.length > 0) {
    const first = entries[0].player;
    room.currentTurn = room.players.indexOf(first);
    if (room.currentTurn === -1) room.currentTurn = 0;
  }
  room.currentDiceConfig = null;
}

function getInitiativeState(room) {
  const init = room.initiative;
  if (!init) return null;
  return {
    phase: init.phase,
    round: init.round,
    playerOptions: init.playerOptions,
    roundCards: init.roundCards,
    chosenCards: init.chosenCards,
    order: init.order,
    picking: init.picking,
    deckSize: init.deck.length,
    roundActive: init.roundActive || false
  };
}

function safeStr(v, maxLen) {
  if (typeof v !== 'string') return '';
  return v.slice(0, maxLen || 500);
}

function hashPassword(pw) {
  if (!pw) return null;
  return crypto.createHash('sha256').update(pw).digest('hex');
}

function createId() {
  return crypto.randomBytes(4).toString('hex');
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(count, sides, explosive) {
  const results = [];
  for (let i = 0; i < Math.min(count, MAX_DICE_COUNT); i++) {
    let r = rollDie(sides);
    results.push(r);
    if (explosive && r === sides) {
      let extra = rollDie(sides);
      results.push(extra);
      while (extra === sides) {
        extra = rollDie(sides);
        results.push(extra);
      }
    }
  }
  return results;
}

function calculateTotal(results) {
  return results.reduce((a, b) => a + b, 0);
}

function getRoomData(room) {
  return {
    id: room.id,
    name: room.name,
    admin: room.admin,
    players: room.players,
    hasPassword: !!room.password,
    currentTurn: room.currentTurn,
    currentDiceConfig: room.currentDiceConfig,
    initiative: getInitiativeState(room),
    lastRolls: Object.fromEntries(room.lastRolls),
    messages: room.messages,
    createdAt: room.createdAt
  };
}

function setupRooms(io) {
  io.on('connection', (socket) => {

    socket.on('disconnect', () => {
      const user = socket.data.user;
      if (!user) return;
      for (const [roomId, room] of rooms) {
        const idx = room.players.indexOf(user.username);
        if (idx !== -1) {
          room.players.splice(idx, 1);
          room.lastRolls.delete(user.username);
          if (room.initiative) {
            delete room.initiative.playerOptions[user.username];
            delete room.initiative.roundCards[user.username];
            delete room.initiative.chosenCards[user.username];
          }
          if (room.players.length === 0) {
            rooms.delete(roomId);
          } else if (room.admin === user.username) {
            room.admin = room.players[0];
            room.currentTurn = 0;
          }
          io.to(roomId).emit('room:updated', getRoomData(room));
        }
      }
    });

    socket.on('room:list', () => {
      socket.emit('rooms:list', Array.from(rooms.values()).map(getRoomData));
    });

    socket.on('room:create', (data) => {
      const user = socket.data.user;
      if (!user) return;
      if (!data || typeof data.name !== 'string') return;
      const id = createId();
      const room = {
        id,
        name: safeStr(data.name, MAX_ROOM_NAME) || 'Sala sin nombre',
        admin: user.username,
        password: hashPassword(data.password),
        players: [user.username],
        currentTurn: 0,
        currentDiceConfig: null,
        initiative: {
          deck: [], round: 0, roundCards: {}, chosenCards: {}, order: [],
          phase: 'idle', picking: [], hadJoker: false, roundActive: false, currentOrderIdx: 0,
          playerOptions: {}
        },
        lastRolls: new Map(),
        messages: [],
        createdAt: Date.now()
      };
      rooms.set(id, room);
      socket.join(id);
      socket.emit('room:created', getRoomData(room));
      io.emit('rooms:list', Array.from(rooms.values()).map(getRoomData));
    });

    socket.on('room:join', (data) => {
      const user = socket.data.user;
      if (!user) return;
      if (!data || typeof data.roomId !== 'string') return;
      const room = rooms.get(data.roomId);
      if (!room) return socket.emit('error', { message: 'La sala no existe' });
      if (room.players.includes(user.username)) return socket.emit('error', { message: 'Ya estas en la sala' });
      if (room.players.length >= MAX_PLAYERS) return socket.emit('error', { message: 'Sala llena' });
      if (room.password && hashPassword(data.password) !== room.password) {
        return socket.emit('room:error', { message: 'Contraseña incorrecta' });
      }
      room.players.push(user.username);
      socket.join(data.roomId);
      socket.emit('room:joined', getRoomData(room));
      io.to(data.roomId).emit('room:updated', getRoomData(room));
      io.emit('rooms:list', Array.from(rooms.values()).map(getRoomData));
    });

    socket.on('room:leave', (data) => {
      const user = socket.data.user;
      if (!user) return;
      if (!data || typeof data.roomId !== 'string') return;
      const room = rooms.get(data.roomId);
      if (!room) return;
      const idx = room.players.indexOf(user.username);
      if (idx === -1) return;
      room.players.splice(idx, 1);
      room.lastRolls.delete(user.username);
      socket.leave(data.roomId);
      if (room.players.length === 0) {
        rooms.delete(data.roomId);
      } else if (room.admin === user.username) {
        room.admin = room.players[0];
        room.currentTurn = 0;
      }
      io.to(data.roomId).emit('room:updated', getRoomData(room));
      io.emit('rooms:list', Array.from(rooms.values()).map(getRoomData));
    });

    socket.on('room:reorder', (data) => {
      const user = socket.data.user;
      if (!user) return;
      if (!data || !Array.isArray(data.players) || typeof data.roomId !== 'string') return;
      const room = rooms.get(data.roomId);
      if (!room || room.admin !== user.username) return;
      if (data.players.length !== room.players.length) return;
      const currentSet = new Set(room.players);
      const newSet = new Set(data.players);
      if (currentSet.size !== newSet.size) return;
      for (const p of currentSet) {
        if (!newSet.has(p)) return;
      }
      room.players = data.players;
      io.to(data.roomId).emit('room:updated', getRoomData(room));
    });

    socket.on('room:next-turn', (data) => {
      const user = socket.data.user;
      if (!user) return;
      if (!data || typeof data.roomId !== 'string') return;
      const room = rooms.get(data.roomId);
      if (!room) return;
      const cur = room.players[room.currentTurn];
      if (cur !== user.username && !(isNPC(cur) && room.admin === user.username)) return;
      const init = room.initiative;
      if (init && init.roundActive && init.order && init.order.length > 0) {
        init.currentOrderIdx++;
        if (init.currentOrderIdx >= init.order.length) {
          init.roundActive = false;
          init.phase = 'idle';
          room.currentTurn = (room.currentTurn + 1) % room.players.length;
          room.currentDiceConfig = null;
        } else {
          const next = init.order[init.currentOrderIdx].player;
          room.currentTurn = room.players.indexOf(next);
          if (room.currentTurn === -1) room.currentTurn = 0;
          room.currentDiceConfig = null;
        }
      } else {
        room.currentTurn = (room.currentTurn + 1) % room.players.length;
        room.currentDiceConfig = null;
      }
      io.to(data.roomId).emit('room:updated', getRoomData(room));
    });

    socket.on('room:kick', (data) => {
      const user = socket.data.user;
      if (!user) return;
      if (!data || typeof data.roomId !== 'string' || typeof data.username !== 'string') return;
      const room = rooms.get(data.roomId);
      if (!room || room.admin !== user.username) return;
      const idx = room.players.indexOf(data.username);
      if (idx === -1 || data.username === room.admin) return;
      room.players.splice(idx, 1);
      room.lastRolls.delete(data.username);
      for (const [, s] of io.sockets.sockets) {
        if (s.data.user?.username === data.username && s.rooms.has(data.roomId)) {
          s.leave(data.roomId);
          s.emit('room:kicked', { username: data.username });
          break;
        }
      }
      io.to(data.roomId).emit('room:updated', getRoomData(room));
      io.emit('rooms:list', Array.from(rooms.values()).map(getRoomData));
    });

    socket.on('room:add-npc', (data) => {
      const user = socket.data.user;
      if (!user) return;
      if (!data || typeof data.roomId !== 'string' || typeof data.name !== 'string') return;
      const room = rooms.get(data.roomId);
      if (!room || room.admin !== user.username) return;
      const npcName = 'NPC:' + safeStr(data.name, 20).replace(/^NPC:/, '');
      if (!npcName || npcName === 'NPC:') return;
      if (room.players.includes(npcName) || room.players.length >= MAX_PLAYERS) return;
      room.players.push(npcName);
      if (room.initiative) {
        room.initiative.playerOptions[npcName] = {};
      }
      io.to(data.roomId).emit('room:updated', getRoomData(room));
      io.emit('rooms:list', Array.from(rooms.values()).map(getRoomData));
    });

    socket.on('room:remove-npc', (data) => {
      const user = socket.data.user;
      if (!user) return;
      if (!data || typeof data.roomId !== 'string' || typeof data.username !== 'string') return;
      const room = rooms.get(data.roomId);
      if (!room || room.admin !== user.username) return;
      if (!data.username.startsWith('NPC:')) return;
      const idx = room.players.indexOf(data.username);
      if (idx === -1) return;
      room.players.splice(idx, 1);
      room.lastRolls.delete(data.username);
      if (room.initiative) {
        delete room.initiative.playerOptions[data.username];
        delete room.initiative.roundCards[data.username];
        delete room.initiative.chosenCards[data.username];
      }
      if (room.currentTurn >= room.players.length) {
        room.currentTurn = 0;
      }
      io.to(data.roomId).emit('room:updated', getRoomData(room));
      io.emit('rooms:list', Array.from(rooms.values()).map(getRoomData));
    });

    socket.on('room:invite', (data) => {
      const user = socket.data.user;
      if (!user) return;
      if (!data || typeof data.roomId !== 'string' || typeof data.username !== 'string') return;
      const room = rooms.get(data.roomId);
      if (!room || room.admin !== user.username) return;
      for (const [, s] of io.sockets.sockets) {
        if (s.data.user?.username === data.username) {
          s.emit('room:invited', {
            roomId: room.id,
            roomName: room.name,
            by: user.username
          });
          break;
        }
      }
    });

    socket.on('room:message', (data) => {
      const user = socket.data.user;
      if (!user) return;
      if (!data || typeof data.content !== 'string' || typeof data.roomId !== 'string') return;
      const room = rooms.get(data.roomId);
      if (!room) return;
      if (!room.players.includes(user.username)) return;
      const msg = {
        roomId: data.roomId,
        from: user.username,
        content: safeStr(data.content, MAX_MESSAGE_LENGTH),
        timestamp: Date.now()
      };
      room.messages.push(msg);
      if (room.messages.length > 200) room.messages.splice(0, 50);
      io.to(data.roomId).emit('room:message:new', msg);
    });

    socket.on('dice:config', (data) => {
      const user = socket.data.user;
      if (!user) return;
      if (!data || typeof data.roomId !== 'string') return;
      const room = rooms.get(data.roomId);
      if (!room) return;
      if (!room.players.includes(user.username)) return;
      const cur = room.players[room.currentTurn];
      if (cur !== user.username && !(isNPC(cur) && room.admin === user.username)) return;
      room.currentDiceConfig = {
        counts: data.counts || null,
        explosive: !!data.explosive
      };
      socket.to(data.roomId).emit('dice:config-update', {
        roomId: data.roomId,
        counts: room.currentDiceConfig.counts,
        explosive: room.currentDiceConfig.explosive,
        username: user.username
      });
    });

    socket.on('dice:roll', (data) => {
      const user = socket.data.user;
      if (!user) return;
      if (!data || typeof data.roomId !== 'string') return;
      const room = rooms.get(data.roomId);
      if (!room) return;
      if (!room.players.includes(user.username)) return;
      const cur = room.players[room.currentTurn];
      if (cur !== user.username && !(isNPC(cur) && room.admin === user.username)) {
        return socket.emit('room:error', { message: 'No es tu turno' });
      }

      const diceConfig = data.dice || {};
      const explosive = !!data.explosive;
      const color = data.color || '#e94560';
      const allResults = {};
      let total = 0;
      let maxValue = 0;

      const dieTypes = [
        { key: 'd4', sides: 4 }, { key: 'd6', sides: 6 }, { key: 'd8', sides: 8 },
        { key: 'd10', sides: 10 }, { key: 'd12', sides: 12 }, { key: 'd20', sides: 20 },
        { key: 'd100', sides: 100 }
      ];

      for (const dt of dieTypes) {
        const count = parseInt(diceConfig[dt.key]) || 0;
        if (count > 0) {
          const res = rollDice(count, dt.sides, explosive);
          allResults[dt.key] = res;
          total += calculateTotal(res);
          let idx = 0;
          for (let d = 0; d < count && idx < res.length; d++) {
            let dieSum = res[idx];
            idx++;
            if (explosive && dieSum === dt.sides) {
              while (idx < res.length && res[idx - 1] === dt.sides) {
                dieSum += res[idx];
                idx++;
              }
            }
            if (dieSum > maxValue) maxValue = dieSum;
          }
        }
      }

      const rollOwner = isNPC(cur) && room.admin === user.username ? cur : user.username;
      const rollResult = {
        username: rollOwner,
        dice: allResults,
        total,
        maxValue,
        explosive,
        color,
        timestamp: Date.now()
      };

      room.lastRolls.set(rollOwner, rollResult);
      room.currentDiceConfig = null;
      io.to(data.roomId).emit('dice:result', rollResult);
      io.to(data.roomId).emit('room:updated', getRoomData(room));
    });

    socket.on('initiative:config', (data) => {
      const user = socket.data.user;
      if (!user) return;
      if (!data || typeof data.roomId !== 'string') return;
      const room = rooms.get(data.roomId);
      if (!room) return;
      if (!room.initiative) return;
      const target = data.targetPlayer || user.username;
      if (target !== user.username && !(isNPC(target) && room.admin === user.username)) return;
      if (!room.players.includes(target)) return;
      room.initiative.playerOptions[target] = {
        iniciativa: !!data.iniciativa,
        rapido: !!data.rapido,
        temple: !!data.temple,
        templeMejorado: !!data.templeMejorado,
        dubitativo: !!data.dubitativo,
        terrenoPredilecto: !!data.terrenoPredilecto
      };
      io.to(data.roomId).emit('room:updated', getRoomData(room));
    });

    socket.on('initiative:deal', (data) => {
      const user = socket.data.user;
      if (!user) return;
      if (!data || typeof data.roomId !== 'string') return;
      const room = rooms.get(data.roomId);
      if (!room) return;
      if (!room.players.includes(user.username)) return;
      const cur = room.players[room.currentTurn];
      if (cur !== user.username && !(isNPC(cur) && room.admin === user.username)) return;
      if (!room.initiative || room.initiative.phase !== 'idle') return;
      dealCards(room);
      io.to(data.roomId).emit('room:updated', getRoomData(room));
    });

    socket.on('initiative:pick', (data) => {
      const user = socket.data.user;
      if (!user) return;
      if (!data || typeof data.roomId !== 'string' || typeof data.cardIndex !== 'number') return;
      const room = rooms.get(data.roomId);
      if (!room) return;
      if (!room.players.includes(user.username)) return;
      const target = data.targetPlayer || user.username;
      if (target !== user.username && !(isNPC(target) && room.admin === user.username)) return;
      const init = room.initiative;
      if (!init || init.phase !== 'picking') return;
      const cards = init.roundCards[target];
      if (!cards || data.cardIndex < 0 || data.cardIndex >= cards.length) return;
      init.chosenCards[target] = cards[data.cardIndex];
      init.picking = init.picking.filter(p => p !== target);
      if (init.picking.length === 0) {
        finalizeInitiative(room);
      }
      io.to(data.roomId).emit('room:updated', getRoomData(room));
    });
  });
}

module.exports = { setupRooms };
