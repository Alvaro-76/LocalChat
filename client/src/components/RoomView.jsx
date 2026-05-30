import React, { useState, useRef, useEffect, useCallback } from 'react';
import DiceRoller from './DiceRoller';
import Avatar from './Avatar';

export default function RoomView({ room, currentUser, onRoll, onLeave, onReorder, onNextTurn, onKick, onInvite, onMessage, onConfigChange, messages }) {
  const isAdmin = room.admin === currentUser;
  const currentPlayer = room.players?.[room.currentTurn ?? 0] || room.players?.[0];
  const isMyTurn = currentPlayer === currentUser;
  const turnLastRoll = room.lastRolls?.[currentPlayer];
  const canRollDice = isMyTurn;
  const [diceColor, setDiceColor] = useState('#4F6CF7');
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
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: 'var(--bg)'
    },
    header: {
      padding: '14px 24px', background: 'var(--header-bg)', borderBottom: '1px solid var(--border)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    headerTitle: { fontSize: '16px', fontWeight: 600, color: 'var(--text)' },
    headerSub: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' },
    leaveBtn: {
      padding: '6px 14px', border: '2px solid var(--danger)', borderRadius: '20px',
      background: 'transparent', color: 'var(--danger)', cursor: 'pointer',
      fontSize: '12px', fontWeight: 600
    },
    body: {
      flex: 1, display: 'flex', overflow: 'hidden'
    },
    mainArea: {
      flex: 1, overflow: 'auto', padding: '16px 24px',
      display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0
    },
    sidebar: {
      width: '260px', background: 'var(--surface)', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column'
    },
    sidebarTitle: {
      padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text)',
      textTransform: 'uppercase', letterSpacing: '0.8px',
      borderBottom: '1px solid var(--border)'
    },
    playerList: { flex: 1, overflowY: 'auto', padding: '8px' },
    playerItem: (isCurrent, isMe, isDragging) => ({
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 10px', borderRadius: '10px', marginBottom: '4px',
      background: isCurrent ? 'var(--accent-light)' : 'var(--surface-hover)',
      border: isCurrent ? '2px solid var(--secondary)' : '2px solid transparent',
      opacity: isDragging ? 0.4 : 1,
      transition: 'all 0.15s',
      cursor: isAdmin ? 'grab' : 'default'
    }),
    playerInfo: { flex: 1, minWidth: 0 },
    playerName: { fontSize: '13px', fontWeight: 500, color: 'var(--text)' },
    playerStatus: (isCurrent) => ({
      fontSize: '10px', color: isCurrent ? 'var(--secondary)' : 'var(--text-muted)',
      fontWeight: isCurrent ? 600 : 400
    }),
    adminBadge: {
      fontSize: '9px', background: 'var(--badge-bg)', color: 'var(--badge-text)',
      padding: '1px 4px', borderRadius: '3px', marginLeft: '4px', fontWeight: 600
    },
    moveBtn: {
      background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
      fontSize: '14px', padding: '0 2px', lineHeight: 1
    },
    kickBtn: {
      background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer',
      fontSize: '14px', padding: '0 2px', lineHeight: 1
    },
    turnActions: {
      padding: '12px 16px', borderTop: '1px solid var(--border)'
    },
    nextTurnBtn: {
      width: '100%', padding: '8px', border: 'none', borderRadius: '8px',
      background: diceColor, color: '#fff', fontSize: '13px', fontWeight: 600,
      cursor: 'pointer', marginBottom: '6px'
    },
    inviteForm: { display: 'flex', gap: '4px' },
    inviteInput: {
      flex: 1, padding: '6px 10px', border: '2px solid var(--border)',
      borderRadius: '8px', fontSize: '12px', background: 'var(--input-bg)',
      color: 'var(--text)', outline: 'none'
    },
    inviteBtn: {
      padding: '6px 12px', border: 'none', borderRadius: '8px',
      background: 'var(--success)', color: '#fff', fontSize: '11px',
      fontWeight: 600, cursor: 'pointer'
    },
    card: {
      background: 'var(--surface)', borderRadius: '12px', padding: '16px',
      border: '1px solid var(--border)', boxShadow: '0 1px 3px var(--shadow)'
    },
    cardTitle: { fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    lastRollItem: (color, muted) => ({
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 10px', borderRadius: '8px', marginBottom: '4px',
      background: 'var(--surface-hover)', borderLeft: `3px solid ${muted ? `${color}40` : color}`,
      opacity: muted ? 0.6 : 1
    }),
    lastRollUser: { fontSize: '13px', fontWeight: 600, color: 'var(--text)' },
    lastRollInfo: { fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' },
    lastRollTotal: { fontWeight: 700, color: 'var(--text)' },
    chatSection: {
      background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', maxHeight: '280px'
    },
    chatMessages: {
      flex: 1, overflowY: 'auto', padding: '8px 12px', minHeight: '80px'
    },
    chatMsg: {
      padding: '6px 0', fontSize: '14px',
      display: 'flex', alignItems: 'flex-start', gap: '8px'
    },
    chatMsgContent: { flex: 1 },
    chatMsgFrom: { fontSize: '11px', fontWeight: 600, color: diceColor },
    chatMsgContentText: { fontSize: '14px', wordBreak: 'break-word', color: 'var(--text)' },
    chatMsgTime: { fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap' },
    chatEmpty: { color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px' },
    chatInputForm: {
      display: 'flex', gap: '6px', padding: '8px 12px',
      borderTop: '1px solid var(--border)'
    },
    chatInput: {
      flex: 1, padding: '8px 12px', border: '2px solid var(--border)',
      borderRadius: '20px', fontSize: '13px', background: 'var(--input-bg)',
      color: 'var(--text)', outline: 'none'
    },
    chatSendBtn: {
      padding: '8px 16px', border: 'none', borderRadius: '20px',
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
            key={currentPlayer}
            onRoll={onRoll}
            lastRoll={turnLastRoll}
            color={diceColor}
            onColorChange={setDiceColor}
            disabled={!canRollDice}
            currentDiceConfig={room.currentDiceConfig}
            onConfigChange={canRollDice ? onConfigChange : undefined}
          />

          {room.lastRolls && Object.keys(room.lastRolls).length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>Últimas tiradas</div>
              {Object.entries(room.lastRolls)
                .filter(([name]) => name !== currentPlayer)
                .reverse()
                .map(([name, roll]) => (
                  <div key={name} style={styles.lastRollItem(roll.color || '#4F6CF7', true)}>
                    <div>
                      <div style={styles.lastRollUser}>{name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDiceSummary(roll)}</div>
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
            <div style={{ ...styles.cardTitle, padding: '10px 12px', borderBottom: '1px solid var(--border)', margin: 0 }}>
              Chat de sala
            </div>
            <div style={styles.chatMessages}>
              {(!messages || messages.length === 0) ? (
                <div style={styles.chatEmpty}>No hay mensajes en la sala</div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} style={styles.chatMsg}>
                    <Avatar user={{ username: msg.from }} size={24} />
                    <div style={styles.chatMsgContent}>
                      <span style={styles.chatMsgFrom}>{msg.from}</span>
                      <div style={styles.chatMsgContentText}>{msg.content}</div>
                    </div>
                    <div style={styles.chatMsgTime}>{formatTime(msg.timestamp)}</div>
                  </div>
                ))
              )}
              <div ref={chatRef} />
            </div>
            <form style={styles.chatInputForm} onSubmit={handleChatSubmit}>
              <input
                style={styles.chatInput}
                placeholder="Escribe un mensaje..."
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
            {isAdmin && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>(arrastra)</span>}
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
                  <Avatar user={{ username }} size={28} />
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
                  placeholder="Invitado..."
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
