import React, { useState } from 'react';

export default function GroupsPanel({ groups, activeGroup, onSelect, onCreate, onLeave, currentUser }) {
  const [groupName, setGroupName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  function handleCreate(e) {
    e.preventDefault();
    const name = groupName.trim();
    if (!name) return;
    onCreate(name);
    setGroupName('');
    setShowCreate(false);
  }

  const styles = {
    section: { padding: '12px', borderTop: '1px solid #0f3460' },
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '8px'
    },
    title: {
      fontSize: '12px', color: '#888', textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    addBtn: {
      background: 'none', border: 'none', color: '#4ade80',
      cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 4px'
    },
    groupItem: (active) => ({
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
      marginBottom: '2px', transition: 'all 0.2s',
      background: active ? '#0f3460' : 'transparent',
      border: active ? '1px solid #4ade80' : '1px solid transparent'
    }),
    groupIcon: { fontSize: '16px' },
    groupInfo: { flex: 1, minWidth: 0 },
    groupName: { fontSize: '14px', fontWeight: 500 },
    groupMeta: { fontSize: '11px', color: '#888' },
    badge: {
      fontSize: '10px', padding: '1px 5px', borderRadius: '4px',
      background: '#4ade80', color: '#000', marginLeft: '4px'
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
      background: '#4ade80', color: '#000', fontSize: '12px', cursor: 'pointer'
    },
    empty: { color: '#555', fontSize: '12px', padding: '4px 8px' }
  };

  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <div style={styles.title}>Grupos</div>
        <button style={styles.addBtn} onClick={() => setShowCreate(!showCreate)} title="Crear grupo">+</button>
      </div>

      {showCreate && (
        <form style={styles.createForm} onSubmit={handleCreate}>
          <input
            style={styles.createInput}
            placeholder="Nombre del grupo"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <button style={styles.createSubmit} type="submit">Crear</button>
        </form>
      )}

      {groups.length === 0 && (
        <div style={styles.empty}>No hay grupos. Crea uno nuevo.</div>
      )}

      {groups.map((g) => (
        <div key={g.id} style={styles.groupItem(activeGroup?.id === g.id)} onClick={() => onSelect(g)}>
          <span style={styles.groupIcon}>💬</span>
          <div style={styles.groupInfo}>
            <div style={styles.groupName}>
              {g.name}
              <span style={styles.badge}>{g.members.length}</span>
            </div>
            <div style={styles.groupMeta}>
              {g.members.length} miembro{g.members.length !== 1 ? 's' : ''}
              {g.admin === currentUser && ' · Admin'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
