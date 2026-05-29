import React, { useState, useRef, useEffect, useCallback } from 'react';
import DiceRoller from './DiceRoller';

export default function RoomView({ room, currentUser, onRoll, onLeave, onReorder, onNextTurn, onKick, onInvite, onMessage, messages }) {
  const isAdmin = room.admin === currentUser;
  const currentPlayer = room.players[room.currentTurn];
  const isMyTurn = currentPlayer === currentUser;
  const myLastRoll = room.lastRolls?.[currentUser];
  const [diceColor, setDiceColor] = useState('#e94560');
  const [inviteUser, setInviteUser] = useState('');
  const [chatText, setChatText] = useState('');
  const [dragIdx, setDragIdx] = useState(null);
  const chatRef = useRef(null);

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleMovePlayer(idx, direction) {
    if (!isAdmin) return;
    const players = [...room.players];
    const target = idx + direction;
    if (target < 0 || target >= players.length) return;
    [players[idx], players[target]] = [players[target], players[idx]];
    onReorder(players);
  }

  function handleDragStart(idx) {
    setDragIdx(idx);
  }

  function handleDragOver(e, idx) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx || !isAdmin) return;
    const players = [...room.players];
    const [moved] = players.splice(dragIdx, 1);
    players.splice(idx, 0, moved);
    setDragIdx(idx);
    onReorder(players);
  }

  function handleDragEnd() {
    setDragIdx(null);
  }

  function handleInvite(e) {
    e.preventDefault();
    if (inviteUser.trim()) {
      onInvite(inviteUser.trim());
      setInviteUser('');
    }
  }

  function handleChatSubmit(e) {
    e.preventDefault();
    const trimmed = chatText.trim();
    if (!trimmed) return;
    onMessage(trimmed);
    setChatText('');
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString();
  }

  function formatDiceSummary(roll) {
    return Object.entries(roll.dice).map(([k, v]) => `${k}[${v.join(',')}]`).join(' ');
  }

  const styles = {
    container: {
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'
    },
    header: {
      padding: '16px 24px', background: '#16213e', borderBottom: '1px solid #0f3460',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    headerTitle: { fontSize: '18px', fontWeight: 600 },
    headerSub: { fontSize: '13px', color: '#888' },
    leaveBtn: {
      padding: '6px 14px', border: '1px solid #e94560', borderRadius: '6px',
      background: 'transparent', color: '#e94560', cursor: 'pointer', fontSize: '12px'
    },
    body: {
      flex: 1, display: 'flex', overflow: 'hidden'
    },
    mainArea: {
      flex: 1, overflow: 'auto', padding: '16px 24px',
      display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0
    },
    sidebar: {
      width: '260px', background: '#16213e', borderLeft: '1px solid #0f3460',
      display: 'flex', flexDirection: 'column'
    },
    sidebarTitle: {
      padding: '12px 16px', fontSize: '12px', color: '#888',
      textTransform: 'uppercase', letterSpacing: '1px',
      borderBottom: '1px solid #0f3460'
    },
    playerList: { flex: 1, overflowY: 'auto', padding: '8px' },
    playerItem: (isCurrent, isMe, isDragging) => ({
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 10px', borderRadius: '8px', marginBottom: '4px',
      background: isCurrent ? `${diceColor}25` : '#1a1a2e',
      border: isCurrent ? `1px solid ${diceColor}` : '1px solid transparent',
      opacity: isDragging ? 0.4 : 1,
      transition: 'all 0.15s',
      cursor: isAdmin ? 'grab' : 'default'
    }),
    playerAvatar: (isMe) => ({
      width: '28px', height: '28px', borderRadius: '50%',
      background: isMe ? diceColor : '#0f3460',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '12px', fontWeight: 600, flexShrink: 0
    }),
    playerInfo: { flex: 1, minWidth: 0 },
    playerName: { fontSize: '13px', fontWeight: 500 },
    playerStatus: (isCurrent) => ({
      fontSize: '10px', color: isCurrent ? diceColor : '#555',
      fontWeight: isCurrent ? 600 : 400
    }),
    adminBadge: {
      fontSize: '9px', background: '#e94560', padding: '1px 4px',
      borderRadius: '3px', marginLeft: '4px'
    },
    moveBtn: {
      background: 'none', border: 'none', color: '#888', cursor: 'pointer',
      fontSize: '14px', padding: '0 2px', lineHeight: 1
    },
    kickBtn: {
      background: 'none', border: 'none', color: '#e94560', cursor: 'pointer',
      fontSize: '14px', padding: '0 2px', lineHeight: 1
    },
    turnActions: {
      padding: '12px 16px', borderTop: '1px solid #0f3460'
    },
    nextTurnBtn: {
      width: '100%', padding: '8px', border: 'none', borderRadius: '6px',
      background: diceColor, color: '#fff', fontSize: '13px', fontWeight: 600,
      cursor: 'pointer', marginBottom: '6px'
    },
    inviteForm: { display: 'flex', gap: '4px' },
    inviteInput: {
      flex: 1, padding: '6px 8px', border: '1px solid #0f3460',
      borderRadius: '4px', fontSize: '12px', background: '#1a1a2e',
      color: '#eee', outline: 'none'
    },
    inviteBtn: {
      padding: '6px 10px', border: 'none', borderRadius: '4px',
      background: '#0f3460', color: '#eee', fontSize: '11px', cursor: 'pointer'
    },
    lastRollsSection: {
      background: '#16213e', borderRadius: '8px',
      padding: '12px 16px', border: '1px solid #0f3460'
    },
    lastRollsTitle: { fontSize: '13px', color: '#888', marginBottom: '8px' },
    lastRollItem: (color) => ({
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 8px', borderRadius: '6px', marginBottom: '4px',
      background: `${color}15`, borderLeft: `3px solid ${color}`
    }),
    lastRollUser: { fontSize: '13px', fontWeight: 600 },
    lastRollInfo: { fontSize: '12px', color: '#aaa', textAlign: 'right' },
    lastRollTotal: { fontWeight: 700 },
    chatSection: {
      background: '#16213e', borderRadius: '8px', border: '1px solid #0f3460',
      display: 'flex', flexDirection: 'column', maxHeight: '300px'
    },
    chatMessages: {
      flex: 1, overflowY: 'auto', padding: '8px 12px', minHeight: '100px'
    },
    chatMsg: {
      padding: '4px 0', fontSize: '14px', borderBottom: '1px solid #0f346020'
    },
    chatMsgFrom: { fontSize: '11px', fontWeight: 600, color: diceColor },
    chatMsgContent: { fontSize: '14px', wordBreak: 'break-word' },
    chatMsgTime: { fontSize: '10px', color: '#555', float: 'right' },
    chatEmpty: { color: '#555', fontSize: '13px', textAlign: 'center', padding: '24px' },
    chatInputForm: {
      display: 'flex', gap: '6px', padding: '8px 12px',
      borderTop: '1px solid #0f3460'
    },
    chatInput: {
      flex: 1, padding: '8px 10px', border: '1px solid #0f3460',
      borderRadius: '6px', fontSize: '13px', background: '#1a1a2e',
      color: '#eee', outline: 'none'
    },
    chatSendBtn: {
      padding: '8px 14px', border: 'none', borderRadius: '6px',
      background: diceColor, color: '#fff', fontSize: '12px', fontWeight: 600,
      cursor: 'pointer'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>🎲 {room.name}</div>
          <div style={styles.headerSub}>
            {room.players.length} jugador{room.players.length !== 1 ? 'es' : ''} · Admin: {room.admin}
            {currentPlayer && (
              <span style={{ marginLeft: '8px', color: diceColor, fontWeight: 600 }}>
                🎯 Turno: {currentPlayer}
              </span>
            )}
          </div>
        </div>
        <button style={styles.leaveBtn} onClick={onLeave}>Salir de la sala</button>
      </div>

      <div style={styles.body}>
        <div style={styles.mainArea}>
          <DiceRoller
            onRoll={onRoll}
            lastRoll={myLastRoll}
            color={diceColor}
            onColorChange={setDiceColor}
          />

          {room.lastRolls && Object.keys(room.lastRolls).length > 0 && (
            <div style={styles.lastRollsSection}>
              <div style={styles.lastRollsTitle}>Últimas tiradas de la sala</div>
              {Object.entries(room.lastRolls)
                .filter(([name]) => name !== currentUser)
                .reverse()
                .map(([name, roll]) => (
                  <div key={name} style={styles.lastRollItem(roll.color || '#e94560')}>
                    <div>
                      <div style={styles.lastRollUser}>{name}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>{formatDiceSummary(roll)}</div>
                    </div>
                    <div style={styles.lastRollInfo}>
                      <div style={styles.lastRollTotal}>{roll.total}</div>
                      <div style={{ fontSize: '10px' }}>{formatTime(roll.timestamp)}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <div style={styles.chatSection}>
            <div style={{ ...styles.lastRollsTitle, padding: '8px 12px', borderBottom: '1px solid #0f3460', margin: 0 }}>
              Chat de sala
            </div>
            <div style={styles.chatMessages}>
              {(!messages || messages.length === 0) ? (
                <div style={styles.chatEmpty}>No hay mensajes en la sala</div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} style={styles.chatMsg}>
                    <span style={styles.chatMsgFrom}>{msg.from}</span>
                    <span style={styles.chatMsgTime}>{formatTime(msg.timestamp)}</span>
                    <div style={styles.chatMsgContent}>{msg.content}</div>
                  </div>
                ))
              )}
              <div ref={chatRef} />
            </div>
            <form style={styles.chatInputForm} onSubmit={handleChatSubmit}>
              <input
                style={styles.chatInput}
                placeholder="Escribe un mensaje en la sala..."
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
              />
              <button style={styles.chatSendBtn} type="submit">Enviar</button>
            </form>
          </div>
        </div>

        <div style={styles.sidebar}>
          <div style={styles.sidebarTitle}>
            Jugadores
            {isAdmin && <span style={{ fontSize: '10px', color: '#888', fontWeight: 400, marginLeft: '8px' }}>(arrastra para ordenar)</span>}
          </div>
          <div style={styles.playerList}>
            {room.players.map((username, idx) => {
              const isCurrent = username === currentPlayer;
              const isMe = username === currentUser;
              return (
                <div
                  key={username}
                  style={styles.playerItem(isCurrent, isMe, dragIdx === idx)}
                  draggable={isAdmin}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                >
                  <div style={styles.playerAvatar(isMe)}>
                    {username[0].toUpperCase()}
                  </div>
                  <div style={styles.playerInfo}>
                    <div style={styles.playerName}>
                      {username}
                      {room.admin === username && <span style={styles.adminBadge}>Admin</span>}
                    </div>
                    <div style={styles.playerStatus(isCurrent)}>
                      {isCurrent ? '🎯 Turno actual' : isMe ? 'Tú' : ''}
                    </div>
                  </div>
                  {isAdmin && !isMe && (
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {idx > 0 && (
                        <button style={styles.moveBtn} onClick={() => handleMovePlayer(idx, -1)} title="Subir">↑</button>
                      )}
                      {idx < room.players.length - 1 && (
                        <button style={styles.moveBtn} onClick={() => handleMovePlayer(idx, 1)} title="Bajar">↓</button>
                      )}
                      <button style={styles.kickBtn} onClick={() => onKick(username)} title="Expulsar">✕</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={styles.turnActions}>
            {isMyTurn && (
              <button style={styles.nextTurnBtn} onClick={onNextTurn}>
                Pasar turno →
              </button>
            )}
            {isAdmin && (
              <form style={styles.inviteForm} onSubmit={handleInvite}>
                <input
                  style={styles.inviteInput}
                  placeholder="Invitado por nombre..."
                  value={inviteUser}
                  onChange={(e) => setInviteUser(e.target.value)}
                />
                <button style={styles.inviteBtn} type="submit">Invitar</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
