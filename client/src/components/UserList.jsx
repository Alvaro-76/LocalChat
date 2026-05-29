import React from 'react';
import Avatar from './Avatar';

export default function UserList({ users, currentUser, selectedUser, onSelect, onGlobalClick, activeTab, unreadGlobal, unreadPrivate }) {
  const filtered = users.filter((u) => u.username !== currentUser);

  const styles = {
    section: {},
    sectionTitle: {
      padding: '12px 20px 4px',
      fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)',
      textTransform: 'uppercase', letterSpacing: '0.8px'
    },
    globalItem: (active) => ({
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 20px', cursor: 'pointer',
      transition: 'all 0.15s',
      background: active ? 'var(--accent-light)' : 'transparent',
      borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent'
    }),
    channelIcon: {
      width: '36px', height: '36px', borderRadius: '50%',
      background: 'var(--accent)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '16px', flexShrink: 0, color: '#fff'
    },
    channelInfo: { flex: 1, minWidth: 0 },
    channelName: { fontSize: '14px', fontWeight: 500, color: 'var(--text)' },
    channelStatus: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px' },
    userItem: (isSelected) => ({
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '8px 20px', cursor: 'pointer',
      transition: 'all 0.15s',
      background: isSelected ? 'var(--accent-light)' : 'transparent',
      borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent'
    }),
    userInfo: { flex: 1, minWidth: 0 },
    userName: { fontSize: '14px', fontWeight: 500, color: 'var(--text)' },
    userStatus: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px' },
    statusDot: {
      width: '10px', height: '10px', borderRadius: '50%',
      background: 'var(--online-dot)', flexShrink: 0,
      boxShadow: '0 0 0 2px var(--surface)'
    },
    badge: {
      fontSize: '10px', background: 'var(--badge-bg)', color: 'var(--badge-text)',
      padding: '1px 6px', borderRadius: '4px', marginLeft: '6px',
      fontWeight: 600
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
      <div style={styles.sectionTitle}>Chats</div>
      <div style={styles.globalItem(activeTab === 'global')} onClick={onGlobalClick}>
        <div style={styles.channelIcon}>#</div>
        <div style={styles.channelInfo}>
          <div style={styles.channelName}>General</div>
          <div style={styles.channelStatus}>Todos los conectados</div>
        </div>
        {unreadGlobal > 0 && <div style={styles.unreadBadge}>{unreadGlobal}</div>}
      </div>

      <div style={{ ...styles.sectionTitle, marginTop: '8px' }}>En línea · {filtered.length}</div>
      {filtered.map((u) => {
        const isSelected = selectedUser?.username === u.username;
        const unread = unreadPrivate?.[u.username] || 0;
        return (
          <div key={u.username} style={styles.userItem(isSelected)} onClick={() => onSelect(u)}>
            <Avatar user={u} size={36} />
            <div style={styles.userInfo}>
              <div style={styles.userName}>
                {u.username}
                {u.role === 'admin' && <span style={styles.badge}>Admin</span>}
              </div>
              <div style={styles.userStatus}>En línea</div>
            </div>
            {unread > 0 && <div style={styles.unreadBadge}>{unread}</div>}
            <div style={styles.statusDot} />
          </div>
        );
      })}
    </div>
  );
}
