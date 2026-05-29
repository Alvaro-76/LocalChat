import React from 'react';
import Avatar from './Avatar';

export default function UserList({ users, currentUser, selectedUser, onSelect, onGlobalClick, activeTab }) {
  const styles = {
    container: {
      flex: 1, overflowY: 'auto', padding: '12px'
    },
    sectionTitle: {
      fontSize: '12px', color: '#888', textTransform: 'uppercase',
      letterSpacing: '1px', marginBottom: '8px', padding: '0 4px'
    },
    globalItem: (active) => ({
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
      marginBottom: '4px', transition: 'all 0.2s',
      background: active ? '#0f3460' : 'transparent',
      border: active ? '1px solid #e94560' : '1px solid transparent'
    }),
    userItem: (isSelected) => ({
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
      marginBottom: '2px', transition: 'all 0.2s',
      background: isSelected ? '#0f3460' : 'transparent'
    }),
    name: { fontSize: '14px', fontWeight: 500 },
    status: {
      width: '8px', height: '8px', borderRadius: '50%',
      background: '#4ade80', marginLeft: 'auto', flexShrink: 0
    },
    badge: {
      fontSize: '10px', background: '#e94560', padding: '1px 5px',
      borderRadius: '4px', marginLeft: '4px'
    }
  };

  const filtered = users.filter((u) => u.username !== currentUser);

  return (
    <div style={styles.container}>
      <div style={styles.sectionTitle}>Canales</div>
      <div style={styles.globalItem(activeTab === 'global')} onClick={onGlobalClick}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0f3460', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>#</div>
        <div style={styles.name}>General</div>
      </div>

      <div style={{ ...styles.sectionTitle, marginTop: '16px' }}>En línea ({filtered.length})</div>
      {filtered.map((u) => {
        const isSelected = selectedUser?.username === u.username;
        return (
          <div key={u.username} style={styles.userItem(isSelected)} onClick={() => onSelect(u)}>
            <Avatar user={u} size={32} />
            <div>
              <div style={styles.name}>
                {u.username}
                {u.role === 'admin' && <span style={styles.badge}>Admin</span>}
              </div>
            </div>
            <div style={styles.status} />
          </div>
        );
      })}
    </div>
  );
}
