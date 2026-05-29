import React, { useState } from 'react';

export default function RoomsPanel({ rooms, activeRoom, onSelect, onCreate, onJoin, currentUser }) {
  const [roomName, setRoomName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  function handleCreate(e) {
    e.preventDefault();
    const name = roomName.trim();
    if (!name) return;
    onCreate(name);
    setRoomName('');
    setShowCreate(false);
  }

  const myRooms = rooms.filter((r) => r.players.includes(currentUser));
  const otherRooms = rooms.filter((r) => !r.players.includes(currentUser));

  const styles = {
    section: { padding: '12px' },
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '8px'
    },
    title: {
      fontSize: '12px', color: '#888', textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    addBtn: {
      background: 'none', border: 'none', color: '#e94560',
      cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 4px'
    },
    roomItem: (active) => ({
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
      marginBottom: '2px', transition: 'all 0.2s',
      background: active ? '#0f3460' : 'transparent',
      border: active ? '1px solid #e94560' : '1px solid transparent'
    }),
    roomIcon: { fontSize: '16px' },
    roomInfo: { flex: 1, minWidth: 0 },
    roomName: { fontSize: '14px', fontWeight: 500 },
    roomMeta: { fontSize: '11px', color: '#888' },
    badge: (isAdmin) => ({
      fontSize: '10px', padding: '1px 5px', borderRadius: '4px',
      background: isAdmin ? '#e94560' : '#0f3460', color: '#fff',
      marginLeft: '4px'
    }),
    joinBtn: {
      padding: '2px 8px', border: '1px solid #4ade80', borderRadius: '4px',
      background: 'transparent', color: '#4ade80', fontSize: '11px', cursor: 'pointer'
    },
    createForm: {
      display: 'flex', gap: '6px', marginBottom: '8px'
    },
    createInput: {
      flex: 1, padding: '6px 10px', border: '1px solid #0f3460',
      borderRadius: '6px', fontSize: '13px', background: '#1a1a2e',
      color: '#eee', outline: 'none'
    },
    createSubmit: {
      padding: '6px 12px', border: 'none', borderRadius: '6px',
      background: '#e94560', color: '#fff', fontSize: '12px', cursor: 'pointer'
    },
    empty: { color: '#555', fontSize: '12px', padding: '4px 8px' }
  };

  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <div style={styles.title}>Salas</div>
        <button style={styles.addBtn} onClick={() => setShowCreate(!showCreate)} title="Crear sala">+</button>
      </div>

      {showCreate && (
        <form style={styles.createForm} onSubmit={handleCreate}>
          <input
            style={styles.createInput}
            placeholder="Nombre de la sala"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <button style={styles.createSubmit} type="submit">Crear</button>
        </form>
      )}

      {myRooms.length === 0 && otherRooms.length === 0 && (
        <div style={styles.empty}>No hay salas. Crea una nueva.</div>
      )}

      {myRooms.length > 0 && (
        <>
          <div style={{ ...styles.title, fontSize: '11px', marginBottom: '4px', marginTop: '8px' }}>Tus salas</div>
          {myRooms.map((r) => (
            <div key={r.id} style={styles.roomItem(activeRoom?.id === r.id)} onClick={() => onSelect(r)}>
              <span style={styles.roomIcon}>🎲</span>
              <div style={styles.roomInfo}>
                <div style={styles.roomName}>
                  {r.name}
                  <span style={styles.badge(r.admin === currentUser)}>
                    {r.admin === currentUser ? 'Admin' : r.players.length + ' jug'}
                  </span>
                </div>
                <div style={styles.roomMeta}>{r.players.length} jugador{r.players.length !== 1 ? 'es' : ''}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {otherRooms.length > 0 && (
        <>
          <div style={{ ...styles.title, fontSize: '11px', marginBottom: '4px', marginTop: '8px' }}>Disponibles</div>
          {otherRooms.map((r) => (
            <div key={r.id} style={styles.roomItem(false)}>
              <span style={styles.roomIcon}>🎲</span>
              <div style={styles.roomInfo}>
                <div style={styles.roomName}>{r.name}</div>
                <div style={styles.roomMeta}>{r.players.length} jugador{r.players.length !== 1 ? 'es' : ''}</div>
              </div>
              <button style={styles.joinBtn} onClick={(e) => { e.stopPropagation(); onJoin(r.id); }}>Unirse</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
