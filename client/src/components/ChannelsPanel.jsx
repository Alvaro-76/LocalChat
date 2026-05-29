import React, { useState } from 'react';

export default function ChannelsPanel({ groups, activeGroup, onSelect, onCreate, onLeave, currentUser, unreadGroups }) {
  const [channelName, setChannelName] = useState('');
  const [channelPassword, setChannelPassword] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  function handleCreate(e) {
    e.preventDefault();
    const name = channelName.trim();
    if (!name) return;
    onCreate(name, channelPassword.trim() || null);
    setChannelName('');
    setChannelPassword('');
    setShowCreate(false);
  }

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
      background: 'none', border: 'none', color: 'var(--secondary)',
      cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '0 4px',
      fontWeight: 600
    },
    channelItem: (active) => ({
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 20px', cursor: 'pointer',
      transition: 'all 0.15s',
      background: active ? 'var(--accent-light)' : 'transparent',
      borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent'
    }),
    channelIcon: (hasPassword) => ({
      width: '36px', height: '36px', borderRadius: '50%',
      background: hasPassword ? 'var(--secondary)' : 'var(--primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '16px', flexShrink: 0, color: '#fff'
    }),
    channelInfo: { flex: 1, minWidth: 0 },
    channelName: { fontSize: '14px', fontWeight: 500, color: 'var(--text)' },
    channelMeta: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '6px' },
    badge: {
      fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
      background: 'var(--badge-bg)', color: 'var(--badge-text)',
      fontWeight: 600, marginLeft: '6px'
    },
    createForm: {
      padding: '8px 20px 12px', display: 'flex', flexDirection: 'column', gap: '6px'
    },
    createInput: {
      padding: '8px 12px', border: '2px solid var(--border)', borderRadius: '8px',
      fontSize: '13px', background: 'var(--input-bg)', color: 'var(--text)',
      outline: 'none', transition: 'border-color 0.2s'
    },
    createRow: { display: 'flex', gap: '6px' },
    createSubmit: {
      padding: '8px 16px', border: 'none', borderRadius: '8px',
      background: 'var(--gradient-btn)',
      color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
      flex: 1
    },
    createCancel: {
      padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px',
      background: 'var(--surface)', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer'
    },
    passwordHint: { fontSize: '11px', color: 'var(--secondary)', marginTop: '2px', fontWeight: 600 },
    empty: {
      color: 'var(--text-muted)', fontSize: '12px', padding: '8px 20px 12px'
    },
    unreadBadge: {
      fontSize: '11px', background: 'var(--badge-unread)', color: 'var(--badge-unread-text)',
      minWidth: '20px', height: '20px', borderRadius: '10px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, padding: '0 6px', flexShrink: 0
    }
  };

  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <div style={styles.title}>Canales</div>
        <button style={styles.addBtn} onClick={() => setShowCreate(!showCreate)} title="Crear canal">+</button>
      </div>

      {showCreate && (
        <form style={styles.createForm} onSubmit={handleCreate}>
          <input
            style={styles.createInput}
            placeholder="Nombre del canal"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            autoFocus
          />
          <input
            style={styles.createInput}
            type="password"
            placeholder="Contraseña (opcional)"
            value={channelPassword}
            onChange={(e) => setChannelPassword(e.target.value)}
            onFocus={(e) => e.target.style.borderColor = 'var(--secondary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
          {channelPassword && <div style={styles.passwordHint}>🔒 Este canal tendrá contraseña</div>}
          <div style={styles.createRow}>
            <button style={styles.createCancel} type="button" onClick={() => { setShowCreate(false); setChannelPassword(''); }}>Cancelar</button>
            <button style={styles.createSubmit} type="submit">Crear canal</button>
          </div>
        </form>
      )}

      {groups.length === 0 && (
        <div style={styles.empty}>No hay canales. Crea uno nuevo.</div>
      )}

      {groups.map((g) => {
        const isActive = activeGroup?.id === g.id;
        const hasPassword = g.hasPassword;
        const unread = unreadGroups?.[g.id] || 0;
        return (
          <div key={g.id} style={styles.channelItem(isActive)} onClick={() => {
            if (hasPassword && !g.members?.includes(currentUser)) {
              const pwd = prompt('Este canal está protegido con contraseña. Ingresa la contraseña:');
              if (pwd !== null) {
                onSelect(g, pwd);
              }
            } else {
              onSelect(g);
            }
          }}>
            <div style={styles.channelIcon(hasPassword)}>
              {hasPassword ? '🔒' : '#'}
            </div>
            <div style={styles.channelInfo}>
              <div style={styles.channelName}>
                {g.name}
                <span style={styles.badge}>{g.members?.length || 0}</span>
              </div>
              <div style={styles.channelMeta}>
                {g.members?.length || 0} miembro{(g.members?.length || 0) !== 1 ? 's' : ''}
                {g.admin === currentUser && ' · Admin'}
              </div>
            </div>
            {unread > 0 && <div style={styles.unreadBadge}>{unread}</div>}
          </div>
        );
      })}
    </div>
  );
}
