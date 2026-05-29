import React from 'react';

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
    avatar: {
      width: '32px', height: '32px', borderRadius: '50%',
      background: '#e94560', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '14px', fontWeight: 600,
      flexShrink: 0
    },
    name: { fontSize: '14px', fontWeight: 500 },
    status: (isCurrent) => ({
      width: '8px', height: '8px', borderRadius: '50%',
      background: isCurrent ? '#4ade80' : '#4ade80',
      marginLeft: 'auto', flexShrink: 0
    }),
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
        <div style={{ ...styles.avatar, background: '#0f3460', fontSize: '16px' }}>#</div>
        <div style={styles.name}>General</div>
      </div>

      <div style={{ ...styles.sectionTitle, marginTop: '16px' }}>En línea ({filtered.length})</div>
      {filtered.map((u) => {
        const isSelected = selectedUser?.username === u.username;
        return (
          <div key={u.username} style={styles.userItem(isSelected)} onClick={() => onSelect(u)}>
            <div style={styles.avatar}>
              {u.username[0].toUpperCase()}
            </div>
            <div>
              <div style={styles.name}>
                {u.username}
                {u.role === 'admin' && <span style={styles.badge}>Admin</span>}
              </div>
            </div>
            <div style={styles.status(u.username === currentUser)} />
          </div>
        );
      })}
    </div>
  );
}
