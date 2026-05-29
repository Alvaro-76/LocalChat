import React from 'react';

export default function ClipboardPanel({ items, onSend, onCopy, currentUser }) {
  const styles = {
    section: {
      borderTop: '1px solid var(--border)',
      padding: '12px 16px'
    },
    title: {
      fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)',
      textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px'
    },
    shareBtn: {
      width: '100%', padding: '8px', border: '2px solid var(--primary)',
      borderRadius: '8px', background: 'transparent',
      color: 'var(--primary)', cursor: 'pointer', fontSize: '12px',
      fontWeight: 600, marginBottom: '10px'
    },
    empty: {
      color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '12px'
    },
    item: {
      padding: '8px 10px', borderRadius: '8px', marginBottom: '6px',
      background: 'var(--surface-hover)', border: '1px solid var(--border-light)',
      cursor: 'pointer', transition: 'all 0.15s'
    },
    itemHeader: {
      display: 'flex', justifyContent: 'space-between', marginBottom: '4px'
    },
    itemFrom: { fontSize: '11px', fontWeight: 600, color: 'var(--primary)' },
    itemTime: { fontSize: '10px', color: 'var(--text-muted)' },
    itemContent: {
      fontSize: '12px', color: 'var(--text)',
      overflow: 'hidden', textOverflow: 'ellipsis',
      display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical'
    }
  };

  return (
    <div style={styles.section}>
      <div style={styles.title}>Portapapeles compartido</div>
      <button style={styles.shareBtn} onClick={onSend}>
        Compartir mi portapapeles
      </button>
      {items.length === 0 ? (
        <div style={styles.empty}>Nadie ha compartido nada aún</div>
      ) : (
        items.map((item, i) => (
          <div key={i} style={styles.item} onClick={() => onCopy(item.content)} title="Copiar al portapapeles">
            <div style={styles.itemHeader}>
              <span style={styles.itemFrom}>{item.from}</span>
              <span style={styles.itemTime}>
                {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ''}
              </span>
            </div>
            <div style={styles.itemContent}>{item.content}</div>
          </div>
        ))
      )}
    </div>
  );
}
