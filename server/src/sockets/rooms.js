const rooms = new Map();

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(count, sides, explosive) {
  const results = [];
  for (let i = 0; i < count; i++) {
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
    currentTurn: room.currentTurn,
    lastRolls: Object.fromEntries(room.lastRolls),
    messages: room.messages,
    createdAt: room.createdAt
  };
}

function createId() {
  return Math.random().toString(36).substring(2, 8);
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
      const id = createId();
      const room = {
        id,
        name: data.name || 'Sala sin nombre',
        admin: user.username,
        players: [user.username],
        currentTurn: 0,
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
      const room = rooms.get(data.roomId);
      if (!room) return socket.emit('error', { message: 'La sala no existe' });
      if (room.players.includes(user.username)) return socket.emit('error', { message: 'Ya estas en la sala' });
      room.players.push(user.username);
      socket.join(data.roomId);
      socket.emit('room:joined', getRoomData(room));
      io.to(data.roomId).emit('room:updated', getRoomData(room));
      io.emit('rooms:list', Array.from(rooms.values()).map(getRoomData));
    });

    socket.on('room:leave', (data) => {
      const user = socket.data.user;
      if (!user) return;
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
      const room = rooms.get(data.roomId);
      if (!room || room.admin !== user.username) return;
      room.players = data.players;
      io.to(data.roomId).emit('room:updated', getRoomData(room));
    });

    socket.on('room:next-turn', (data) => {
      const user = socket.data.user;
      if (!user) return;
      const room = rooms.get(data.roomId);
      if (!room) return;
      if (room.players[room.currentTurn] !== user.username) return;
      room.currentTurn = (room.currentTurn + 1) % room.players.length;
      io.to(data.roomId).emit('room:updated', getRoomData(room));
    });

    socket.on('room:kick', (data) => {
      const user = socket.data.user;
      if (!user) return;
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

    socket.on('room:invite', (data) => {
      const user = socket.data.user;
      if (!user) return;
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
      const room = rooms.get(data.roomId);
      if (!room) return;
      if (!room.players.includes(user.username)) return;
      const msg = {
        roomId: data.roomId,
        from: user.username,
        content: data.content.slice(0, 1000),
        timestamp: Date.now()
      };
      room.messages.push(msg);
      if (room.messages.length > 200) room.messages.splice(0, 50);
      io.to(data.roomId).emit('room:message:new', msg);
    });

    socket.on('dice:roll', (data) => {
      const user = socket.data.user;
      if (!user) return;
      const room = rooms.get(data.roomId);
      if (!room) return;
      if (!room.players.includes(user.username)) return;

      const diceConfig = data.dice || {};
      const explosive = !!data.explosive;
      const color = data.color || '#e94560';
      const allResults = {};
      let total = 0;

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
        }
      }

      const rollResult = {
        username: user.username,
        dice: allResults,
        total,
        explosive,
        color,
        timestamp: Date.now()
      };

      room.lastRolls.set(user.username, rollResult);
      io.to(data.roomId).emit('dice:result', rollResult);
      io.to(data.roomId).emit('room:updated', getRoomData(room));
    });
  });
}

module.exports = { setupRooms };
