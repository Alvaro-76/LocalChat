import React, { useState } from 'react';

export default function RoomsPanel({ rooms, activeRoom, onSelect, onCreate, onJoin, currentUser }) {
  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  function handleCreate(e) {
    e.preventDefault();
    const name = roomName.trim();
    if (!name) return;
    onCreate(name, roomPassword.trim() || null);
    setRoomName('');
    setRoomPassword('');
    setShowCreate(false);
  }

  const myRooms = rooms.filter((r) => r.players?.includes(currentUser));
  const otherRooms = rooms.filter((r) => !r.players?.includes(currentUser));

  const styles = {
    section: {
      borderBottom: '1px solid var(--border)'
    },
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 20px 4px'
    },
    title: {
      fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)',
      textTransform: 'uppercase', letterSpacing: '0.8px'
    },
    addBtn: {
      background: 'none', border: 'none', color: 'var(--accent)',
      cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '0 4px',
      fontWeight: 600
    },
    roomItem: (active) => ({
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 20px', cursor: 'pointer',
      transition: 'all 0.15s',
      background: active ? 'var(--accent-light)' : 'transparent',
      borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent'
    }),
    roomIcon: (hasPassword) => ({
      width: '36px', height: '36px', borderRadius: '50%',
      background: hasPassword ? 'var(--secondary)' : 'var(--primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '16px', flexShrink: 0, color: '#fff'
    }),
    roomInfo: { flex: 1, minWidth: 0 },
    roomName: { fontSize: '14px', fontWeight: 500, color: 'var(--text)' },
    roomMeta: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px' },
    badge: (isAdmin) => ({
      fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
      background: isAdmin ? 'var(--badge-bg)' : 'var(--border)',
      color: isAdmin ? 'var(--badge-text)' : 'var(--text-secondary)',
      fontWeight: 600, marginLeft: '6px'
    }),
    joinBtn: {
      padding: '4px 12px', border: '2px solid var(--success)', borderRadius: '20px',
      background: 'transparent', color: 'var(--success)', fontSize: '11px',
      cursor: 'pointer', fontWeight: 600
    },
    createForm: {
      padding: '8px 20px 12px', display: 'flex', flexDirection: 'column', gap: '6px'
    },
    createInput: {
      padding: '8px 12px', border: '2px solid var(--border)',
      borderRadius: '8px', fontSize: '13px', background: 'var(--input-bg)',
      color: 'var(--text)', outline: 'none', transition: 'border-color 0.2s'
    },
    createRow: { display: 'flex', gap: '6px' },
    createSubmit: {
      padding: '8px 14px', border: 'none', borderRadius: '8px',
      background: 'var(--gradient-btn)', color: '#fff', fontSize: '12px',
      fontWeight: 600, cursor: 'pointer', flex: 1
    },
    createCancel: {
      padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px',
      background: 'var(--surface)', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer'
    },
    passwordHint: { fontSize: '11px', color: 'var(--secondary)', marginTop: '2px', fontWeight: 600 },
    empty: {
      color: 'var(--text-muted)', fontSize: '12px', padding: '8px 20px 12px'
    }
  };

  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <div style={styles.title}>Salas de dados</div>
        <button style={styles.addBtn} onClick={() => setShowCreate(!showCreate)} title="Crear sala">+</button>
      </div>

      {showCreate && (
        <form style={styles.createForm} onSubmit={handleCreate}>
          <input
            style={styles.createInput}
            placeholder="Nombre de la sala"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            autoFocus
          />
          <input
            style={styles.createInput}
            type="password"
            placeholder="Contraseña (opcional)"
            value={roomPassword}
            onChange={(e) => setRoomPassword(e.target.value)}
            onFocus={(e) => e.target.style.borderColor = 'var(--secondary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
          {roomPassword && <div style={styles.passwordHint}>🔒 Esta sala tendrá contraseña</div>}
          <div style={styles.createRow}>
            <button style={styles.createCancel} type="button" onClick={() => { setShowCreate(false); setRoomPassword(''); }}>Cancelar</button>
            <button style={styles.createSubmit} type="submit">Crear sala</button>
          </div>
        </form>
      )}

      {myRooms.length === 0 && otherRooms.length === 0 && (
        <div style={styles.empty}>No hay salas. Crea una nueva.</div>
      )}

      {myRooms.length > 0 && (
        <>
          <div style={{ ...styles.title, fontSize: '11px', padding: '8px 20px 2px', color: 'var(--text-muted)' }}>Tus salas</div>
          {myRooms.map((r) => (
            <div key={r.id} style={styles.roomItem(activeRoom?.id === r.id)} onClick={() => onSelect(r)}>
              <div style={styles.roomIcon(r.hasPassword)}>
                {r.hasPassword ? '🔒' : '🎲'}
              </div>
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
          <div style={{ ...styles.title, fontSize: '11px', padding: '8px 20px 2px', color: 'var(--text-muted)' }}>Disponibles</div>
          {otherRooms.map((r) => (
            <div key={r.id} style={styles.roomItem(false)}>
              <div style={styles.roomIcon(r.hasPassword)}>
                {r.hasPassword ? '🔒' : '🎲'}
              </div>
              <div style={styles.roomInfo}>
                <div style={styles.roomName}>{r.name}</div>
                <div style={styles.roomMeta}>{r.players.length} jugador{r.players.length !== 1 ? 'es' : ''}</div>
              </div>
              <button style={styles.joinBtn} onClick={(e) => {
                e.stopPropagation();
                if (r.hasPassword) {
                  const pwd = prompt('Esta sala está protegida con contraseña. Ingresa la contraseña:');
                  if (pwd !== null) {
                    onJoin(r.id, pwd);
                  }
                } else {
                  onJoin(r.id);
                }
              }}>Unirse</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
