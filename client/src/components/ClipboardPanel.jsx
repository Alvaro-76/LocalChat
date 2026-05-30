import React, { useState } from 'react';
import { getSocket } from '../services/socket';

export default function ClipboardPanel({ items, onCopy, currentUser }) {
  const [text, setText] = useState('');
  const socket = getSocket();

  function handleShare() {
    const content = text.trim();
    if (!content || !socket) return;
    socket.emit('clipboard:share', { content });
    setText('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleShare();
  }

  const styles = {
    section: {
      borderTop: '1px solid var(--border)',
      padding: '12px 16px'
    },
    title: {
      fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)',
      textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px'
    },
    inputRow: {
      display: 'flex', gap: '6px', marginBottom: '10px'
    },
    input: {
      flex: 1, padding: '8px 10px', border: '2px solid var(--border)',
      borderRadius: '8px', fontSize: '12px', background: 'var(--input-bg)',
      color: 'var(--text)', outline: 'none'
    },
    sendBtn: {
      padding: '8px 14px', border: 'none', borderRadius: '8px',
      background: 'var(--primary)', color: '#fff', fontSize: '12px',
      fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
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
      <div style={styles.inputRow}>
        <input
          style={styles.input}
          placeholder="Pega aquí (Ctrl+V) o escribe..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button style={styles.sendBtn} onClick={handleShare}>Compartir</button>
      </div>
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
