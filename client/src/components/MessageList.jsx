import React, { useEffect, useRef, memo } from 'react';
import Avatar from './Avatar';
import { SERVER_URL } from '../services/config';

const MessageList = memo(function MessageList({ messages, currentUser, isAdmin, onDelete, typingUsers, loading, searchQuery }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  function getMessageUser(msg) {
    const name = msg.from_user || msg.from || '';
    return { username: name };
  }

  const typingList = typingUsers ? Object.keys(typingUsers).filter((u) => typingUsers[u]) : [];

  function highlightText(text) {
    if (!searchQuery || !text) return text;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase()
        ? <span key={i} style={styles.highlight}>{part}</span>
        : part
    );
  }

  const styles = {
    container: {
      flex: 1, overflowY: 'auto', padding: '20px 60px',
      display: 'flex', flexDirection: 'column', gap: '4px',
      background: 'var(--bg)'
    },
    messageRow: (isOwn) => ({
      display: 'flex',
      flexDirection: isOwn ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: '8px',
      maxWidth: '68%',
      alignSelf: isOwn ? 'flex-end' : 'flex-start',
      animation: 'msgSlideIn 0.3s ease-out'
    }),
    avatarCol: { flexShrink: 0, alignSelf: 'flex-end' },
    bubbleWrap: { display: 'flex', flexDirection: 'column' },
    bubble: (isOwn, isPrivate) => ({
      background: isOwn ? 'var(--bubble-own)' : 'var(--bubble-other)',
      padding: '8px 14px', borderRadius: '18px',
      borderBottomRightRadius: isOwn ? '4px' : '18px',
      borderBottomLeftRadius: isOwn ? '18px' : '4px',
      boxShadow: '0 1px 1px var(--shadow)',
      border: isOwn ? '1px solid var(--bubble-own-border)' : '1px solid var(--bubble-other-border)',
      position: 'relative'
    }),
    header: {
      fontSize: '12px', fontWeight: 600,
      marginBottom: '2px',
      display: 'flex', justifyContent: 'space-between', gap: '12px'
    },
    headerName: (isOwn) => ({
      color: isOwn ? 'var(--danger)' : 'var(--accent)'
    }),
    content: { fontSize: '14.5px', wordBreak: 'break-word', lineHeight: 1.4, color: 'var(--text)' },
    fileMsg: {
      display: 'flex', alignItems: 'center', gap: '10px',
      background: 'var(--border-light)', borderRadius: '12px',
      padding: '8px 12px', cursor: 'pointer', marginTop: '4px'
    },
    fileIcon: { fontSize: '28px', flexShrink: 0 },
    fileInfo: { flex: 1, minWidth: 0 },
    fileName: { fontSize: '13px', fontWeight: 600, wordBreak: 'break-all', color: 'var(--text)' },
    fileSize: { fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' },
    fileDownload: { fontSize: '11px', color: 'var(--success)', textDecoration: 'none', fontWeight: 600 },
    uploadingOverlay: {
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '8px 12px', background: 'var(--border-light)',
      borderRadius: '12px'
    },
    uploadingIcon: { fontSize: '28px', flexShrink: 0 },
    uploadingText: { fontSize: '12px', color: 'var(--text-secondary)' },
    time: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', textAlign: 'right' },
    deleteBtn: {
      background: 'none', border: 'none', color: 'var(--danger)',
      cursor: 'pointer', fontSize: '11px', padding: '0 4px'
    },
    empty: {
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-muted)', fontSize: '14px', flexDirection: 'column', gap: '8px'
    },
    emptyIcon: { fontSize: '48px', opacity: 0.5 },
    privateTag: {
      fontSize: '10px', background: 'var(--accent)', color: '#fff',
      padding: '1px 6px', borderRadius: '4px', marginLeft: '4px'
    },
    typingIndicator: {
      fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic',
      padding: '6px 60px', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', gap: '8px',
      borderTop: '1px solid var(--border)'
    },
    typingDots: {
      display: 'flex', gap: '3px', alignItems: 'center'
    },
    typingDot: (delay) => ({
      width: '6px', height: '6px', borderRadius: '50%',
      background: 'var(--text-muted)',
      animation: `typingDot 1.4s ${delay}s infinite`
    }),
    skeleton: {
      display: 'flex', flexDirection: 'column', gap: '12px',
      padding: '20px 60px', flex: 1, overflowY: 'auto'
    },
    skeletonRow: (isOwn) => ({
      display: 'flex',
      flexDirection: isOwn ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: '8px',
      maxWidth: '68%',
      alignSelf: isOwn ? 'flex-end' : 'flex-start'
    }),
    skeletonAvatar: {
      width: '32px', height: '32px', borderRadius: '50%',
      background: 'var(--border)', flexShrink: 0,
      animation: 'pulse 1.5s ease-in-out infinite'
    },
    skeletonBubble: (isOwn, width) => ({
      padding: '12px 14px', borderRadius: '18px',
      borderBottomRightRadius: isOwn ? '4px' : '18px',
      borderBottomLeftRadius: isOwn ? '18px' : '4px',
      background: isOwn ? 'var(--bubble-own)' : 'var(--bubble-other)',
      border: isOwn ? '1px solid var(--bubble-own-border)' : '1px solid var(--bubble-other-border)',
      display: 'flex', flexDirection: 'column', gap: '6px',
      minWidth: '120px'
    }),
    skeletonLine: (isOwn, width) => ({
      height: '12px', borderRadius: '6px',
      background: isOwn ? 'var(--bubble-own-border)' : 'var(--border)',
      width: width || '80%',
      animation: 'pulse 1.5s ease-in-out infinite'
    }),
    highlight: {
      background: '#FFF3CD', color: '#856404', borderRadius: '3px', padding: '0 2px'
    }
  };

  if (loading && messages.length === 0) {
    const skeletonItems = [
      { isOwn: false, lines: ['45%', '70%'] },
      { isOwn: true, lines: ['55%', '30%'] },
      { isOwn: false, lines: ['35%', '65%', '50%'] },
      { isOwn: false, lines: ['60%'] },
      { isOwn: true, lines: ['40%', '75%'] },
    ];
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg)' }}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
        <div style={styles.skeleton}>
          {skeletonItems.map((item, i) => (
            <div key={i} style={styles.skeletonRow(item.isOwn)}>
              <div style={styles.skeletonAvatar} />
              <div style={styles.skeletonBubble(item.isOwn)}>
                <div style={styles.skeletonLine(item.isOwn, item.isOwn ? '30%' : '25%')} />
                {item.lines.map((w, j) => (
                  <div key={j} style={{...styles.skeletonLine(item.isOwn, w), height: '10px'}} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
        <div style={styles.emptyIcon}>💬</div>
        <div style={styles.empty}>No hay mensajes aún</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Escribe algo para comenzar</div>
        <div ref={bottomRef} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={styles.container}>
        {messages.map((msg, i) => {
          const isOwn = msg.from_user === currentUser || msg.from === currentUser;
          const isPrivate = msg.to_user || msg.to;
          const userObj = getMessageUser(msg);

          let parsedContent = null;
          if (msg.content && typeof msg.content === 'string') {
            try { parsedContent = JSON.parse(msg.content); } catch {}
          }
          const isFile = parsedContent?.type === 'file' || (msg.type === 'file' && msg.fileId);
          const f = isFile ? (parsedContent?.type === 'file' ? parsedContent : msg) : null;

          if (msg._uploading) {
            const fu = msg._file;
            return (
              <div key={msg._tempId || i} style={styles.messageRow(msg.from === currentUser)}>
                <div style={{ ...styles.avatarCol, visibility: 'hidden' }}><Avatar user={{ username: msg.from }} size={32} /></div>
                <div style={styles.bubbleWrap}>
                  <div style={styles.bubble(msg.from === currentUser, false)}>
                    <div style={styles.header}>
                      <span style={styles.headerName(msg.from === currentUser)}>{msg.from}</span>
                    </div>
                    <div style={styles.uploadingOverlay}>
                      <span style={styles.uploadingIcon}>📄</span>
                      <div style={styles.fileInfo}>
                        <div style={styles.fileName}>{fu?.name || 'Archivo'}</div>
                        <div style={styles.uploadingText}>Subiendo...</div>
                      </div>
                    </div>
                    <div style={styles.time}>
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                    </div>
                  </div>
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
              <div key={msg.id || i} style={styles.messageRow(isOwn)}>
                <div style={styles.avatarCol}><Avatar user={userObj} size={32} /></div>
                <div style={styles.bubbleWrap}>
                  <div style={styles.bubble(isOwn, isPrivate)}>
                    <div style={styles.header}>
                      <span>
                        <span style={styles.headerName(isOwn)}>{f.from || msg.from_user || msg.from}</span>
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
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id || i} style={styles.messageRow(isOwn)}>
              <div style={styles.avatarCol}><Avatar user={userObj} size={32} /></div>
              <div style={styles.bubbleWrap}>
                <div style={styles.bubble(isOwn, isPrivate)}>
                  <div style={styles.header}>
                    <span>
                      <span style={styles.headerName(isOwn)}>{msg.from_user || msg.from}</span>
                      {isPrivate && <span style={styles.privateTag}>privado</span>}
                    </span>
                    {isAdmin && !isOwn && msg.id && (
                      <button style={styles.deleteBtn} onClick={() => onDelete(msg.id)}>✕</button>
                    )}
                  </div>
                  <div style={styles.content}>{highlightText(msg.content)}</div>
                  <div style={styles.time}>
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {typingList.length > 0 && (
        <div style={styles.typingIndicator}>
          <div style={styles.typingDots}>
            <div style={styles.typingDot(0)} />
            <div style={styles.typingDot(0.2)} />
            <div style={styles.typingDot(0.4)} />
          </div>
          <span>
            {typingList.join(', ')} {typingList.length === 1 ? 'está escribiendo...' : 'están escribiendo...'}
          </span>
        </div>
      )}
    </div>
  );
});

export default MessageList;
