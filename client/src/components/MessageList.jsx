import React, { useEffect, useRef } from 'react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

export default function MessageList({ messages, currentUser, isAdmin, onDelete }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const styles = {
    container: {
      flex: 1, overflowY: 'auto', padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: '8px'
    },
    message: (isOwn, isPrivate) => ({
      alignSelf: isOwn ? 'flex-end' : 'flex-start',
      maxWidth: '70%',
      background: isOwn ? '#e94560' : (isPrivate ? '#1a3a5c' : '#0f3460'),
      padding: '10px 16px', borderRadius: '12px',
      borderBottomRightRadius: isOwn ? '4px' : '12px',
      borderBottomLeftRadius: isOwn ? '12px' : '4px',
      position: 'relative'
    }),
    header: {
      fontSize: '12px', opacity: 0.7, marginBottom: '4px',
      display: 'flex', justifyContent: 'space-between', gap: '12px'
    },
    content: { fontSize: '15px', wordBreak: 'break-word', lineHeight: 1.4 },
    fileMsg: {
      display: 'flex', alignItems: 'center', gap: '10px',
      background: 'rgba(255,255,255,0.08)', borderRadius: '8px',
      padding: '8px 12px', cursor: 'pointer', marginTop: '4px'
    },
    fileIcon: { fontSize: '28px', flexShrink: 0 },
    fileInfo: { flex: 1, minWidth: 0 },
    fileName: { fontSize: '13px', fontWeight: 600, wordBreak: 'break-all' },
    fileSize: { fontSize: '11px', opacity: 0.6, marginTop: '2px' },
    fileDownload: { fontSize: '11px', color: '#4ade80', textDecoration: 'none' },
    uploadingOverlay: {
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '8px 12px', background: 'rgba(255,255,255,0.05)',
      borderRadius: '8px'
    },
    uploadingIcon: { fontSize: '28px', flexShrink: 0 },
    uploadingText: { fontSize: '12px', opacity: 0.6 },
    time: { fontSize: '11px', opacity: 0.5, marginTop: '4px', textAlign: 'right' },
    deleteBtn: {
      background: 'none', border: 'none', color: '#ff6b6b',
      cursor: 'pointer', fontSize: '11px', padding: '0 4px'
    },
    empty: {
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#555', fontSize: '14px'
    },
    privateTag: {
      fontSize: '10px', background: '#2a5a8c', padding: '1px 6px',
      borderRadius: '4px', marginLeft: '4px'
    }
  };

  if (messages.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>No hay mensajes aún</div>
        <div ref={bottomRef} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {messages.map((msg, i) => {
        const isOwn = msg.from_user === currentUser || msg.from === currentUser;
        const isPrivate = msg.to_user || msg.to;

        let parsedContent = null;
        if (msg.content && typeof msg.content === 'string') {
          try { parsedContent = JSON.parse(msg.content); } catch {}
        }
        const isFile = parsedContent?.type === 'file' || (msg.type === 'file' && msg.fileId);
        const f = isFile ? (parsedContent?.type === 'file' ? parsedContent : msg) : null;

        if (msg._uploading) {
          const f = msg._file;
          return (
            <div key={msg._tempId || i} style={styles.message(msg.from === currentUser, false)}>
              <div style={styles.header}>
                <span>{msg.from}</span>
              </div>
              <div style={styles.uploadingOverlay}>
                <span style={styles.uploadingIcon}>📄</span>
                <div style={styles.fileInfo}>
                  <div style={styles.fileName}>{f?.name || 'Archivo'}</div>
                  <div style={styles.uploadingText}>Subiendo...</div>
                </div>
              </div>
              <div style={styles.time}>
                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
              </div>
            </div>
          );
        }

        if (isFile) {
          const fileUrl = `${SERVER_URL}/api/files/${f.fileId}/${encodeURIComponent(f.fileName)}/download`;
          const ext = f.fileName?.split('.').pop()?.toLowerCase() || '';
          const iconMap = {
            pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
            zip: '📦', rar: '📦', '7z': '📦', tar: '📦', gz: '📦',
            jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️',
            svg: '🖼️', mp4: '🎬', mov: '🎬', avi: '🎬',
            mp3: '🎵', wav: '🎵', ogg: '🎵',
            js: '📜', py: '📜', html: '📜', css: '📜', json: '📜'
          };
          const icon = iconMap[ext] || '📎';
          const size = f.fileSize < 1024 ? `${f.fileSize} B` :
            f.fileSize < 1048576 ? `${(f.fileSize / 1024).toFixed(1)} KB` :
            `${(f.fileSize / 1048576).toFixed(1)} MB`;

          return (
            <div key={msg.id || i} style={styles.message(isOwn, isPrivate)}>
              <div style={styles.header}>
                <span>
                  {f.from || msg.from_user || msg.from}
                  {isPrivate && <span style={styles.privateTag}>privado</span>}
                </span>
                {isAdmin && !isOwn && msg.id && (
                  <button style={styles.deleteBtn} onClick={() => onDelete(msg.id)}>✕</button>
                )}
              </div>
              <a href={fileUrl} style={{ textDecoration: 'none', color: 'inherit' }} download>
                <div style={styles.fileMsg}>
                  <span style={styles.fileIcon}>{icon}</span>
                  <div style={styles.fileInfo}>
                    <div style={styles.fileName}>{f.fileName}</div>
                    <div style={styles.fileSize}>{size} — <span style={styles.fileDownload}>Descargar</span></div>
                  </div>
                </div>
              </a>
              <div style={styles.time}>
                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
              </div>
            </div>
          );
        }

        return (
          <div key={msg.id || i} style={styles.message(isOwn, isPrivate)}>
            <div style={styles.header}>
              <span>
                {msg.from_user || msg.from}
                {isPrivate && <span style={styles.privateTag}>privado</span>}
              </span>
              {isAdmin && !isOwn && msg.id && (
                <button style={styles.deleteBtn} onClick={() => onDelete(msg.id)}>✕</button>
              )}
            </div>
            <div style={styles.content}>{msg.content}</div>
            <div style={styles.time}>
              {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
