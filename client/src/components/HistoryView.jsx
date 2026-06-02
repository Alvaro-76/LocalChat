import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../services/socket';
import Avatar from './Avatar';
import { SERVER_URL } from '../services/config';

const FILTERS = [
  { key: null, label: 'Todos' },
  { key: 'global', label: 'Global' },
  { key: 'private', label: 'Privados' },
  { key: 'group', label: 'Grupos' }
];

const PAGE_SIZE = 50;

function formatTime(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString(); } catch { return ''; }
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  } catch { return ''; }
}

export default function HistoryView({ groups, currentUser, isAdmin, onBack, onDelete }) {
  const [allMessages, setAllMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const mountedRef = useRef(true);
  const handlerRef = useRef(null);
  const listRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    const socket = getSocket();
    if (!socket) return;

    const handleDeleted = (data) => {
      if (!mountedRef.current) return;
      setAllMessages(prev => prev.filter(m => m.id !== data.id));
      setTotal(prev => Math.max(0, prev - 1));
    };

    socket.on('message:deleted', handleDeleted);

    return () => {
      mountedRef.current = false;
      socket.off('message:deleted', handleDeleted);
      if (handlerRef.current) socket.off('history:results', handlerRef.current);
    };
  }, []);

  const fetchHistory = useCallback((pageNum, append = false) => {
    const socket = getSocket();
    if (!socket) return;

    if (handlerRef.current) {
      socket.off('history:results', handlerRef.current);
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    const handler = (data) => {
      if (!mountedRef.current) return;
      socket.off('history:results', handler);
      handlerRef.current = null;

      const ordered = (data.messages || []).reverse();

      if (append) {
        const list = listRef.current;
        if (list) prevScrollHeightRef.current = list.scrollHeight;
        setAllMessages(prev => [...ordered, ...prev]);
        setLoadingMore(false);
      } else {
        setAllMessages(ordered);
        setLoading(false);
      }
      setPage(data.page);
      setHasMore(data.hasMore);
      setTotal(data.total);
    };

    handlerRef.current = handler;
    socket.on('history:results', handler);
    socket.emit('history:get', { page: pageNum, limit: PAGE_SIZE, type: filter });
  }, [filter]);

  useEffect(() => {
    fetchHistory(1, false);
  }, [filter]);

  useEffect(() => {
    if (loadingMore && listRef.current) {
      const el = listRef.current;
      const newHeight = el.scrollHeight;
      const diff = newHeight - prevScrollHeightRef.current;
      if (diff > 0) el.scrollTop = diff;
    }
  }, [allMessages, loadingMore]);

  const handleLoadMore = () => {
    fetchHistory(page + 1, true);
  };

  const handleFilterChange = (key) => {
    if (key !== filter) setFilter(key);
  };

  function getMessageUser(msg) {
    return {
      username: msg.from_user,
      avatar: msg.msg_avatar || undefined
    };
  }

  const styles = {
    container: {
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
      background: 'var(--bg)'
    },
    header: {
      padding: '14px 24px', background: 'var(--header-bg)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexShrink: 0
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    backBtn: {
      background: 'none', border: '1px solid var(--border)',
      borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer',
      fontSize: '13px', padding: '6px 14px', fontWeight: 500,
      transition: 'background 0.15s'
    },
    headerTitle: { fontSize: '16px', fontWeight: 600, color: 'var(--text)' },
    headerTotal: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
    filterBar: {
      display: 'flex', gap: '6px', padding: '12px 24px',
      borderBottom: '1px solid var(--border)', background: 'var(--bg)',
      flexShrink: 0
    },
    filterBtn: (active) => ({
      padding: '6px 16px', border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
      borderRadius: '20px', background: active ? 'var(--accent-light)' : 'transparent',
      color: active ? 'var(--primary)' : 'var(--text-secondary)',
      cursor: 'pointer', fontSize: '13px', fontWeight: active ? 600 : 500,
      transition: 'all 0.15s'
    }),
    messageList: {
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
      alignSelf: isOwn ? 'flex-end' : 'flex-start'
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
    privateTag: {
      fontSize: '10px', background: 'var(--accent)', color: '#fff',
      padding: '1px 6px', borderRadius: '4px', marginLeft: '4px'
    },
    deleteBtn: {
      background: 'none', border: 'none', color: 'var(--danger)',
      cursor: 'pointer', fontSize: '11px', padding: '0 4px'
    },
    time: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', textAlign: 'right' },
    loadMoreRow: {
      display: 'flex', justifyContent: 'center', padding: '16px 0 8px'
    },
    loadMoreBtn: {
      padding: '10px 32px', border: '2px solid var(--primary)',
      borderRadius: '20px', background: 'transparent',
      color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
      transition: 'all 0.15s'
    },
    loadMoreBtnDisabled: {
      padding: '10px 32px', border: '2px solid var(--border)',
      borderRadius: '20px', background: 'transparent',
      color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, cursor: 'default'
    },
    loadingRow: {
      display: 'flex', justifyContent: 'center', padding: '24px',
      color: 'var(--text-muted)', fontSize: '14px'
    },
    empty: {
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-muted)', fontSize: '14px', flexDirection: 'column', gap: '8px'
    },
    emptyIcon: { fontSize: '48px', opacity: 0.5 }
  };

  function renderFileMsg(f) {
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
      <a href={fileUrl} style={{ textDecoration: 'none', color: 'inherit' }} download>
        <div style={styles.fileMsg}>
          <span style={styles.fileIcon}>{icon}</span>
          <div style={styles.fileInfo}>
            <div style={styles.fileName}>{f.fileName}</div>
            <div style={styles.fileSize}>{size} — <span style={styles.fileDownload}>Descargar</span></div>
          </div>
        </div>
      </a>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backBtn} onClick={onBack}>← Volver</button>
          <div>
            <div style={styles.headerTitle}>📋 Historial</div>
            <div style={styles.headerTotal}>
              {loading ? 'Cargando...' : `${total} mensaje${total !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.filterBar}>
        {FILTERS.map(f => (
          <button key={f.key} style={styles.filterBtn(filter === f.key)} onClick={() => handleFilterChange(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={styles.messageList} ref={listRef}>
        {loading && (
          <div style={styles.loadingRow}>Cargando historial...</div>
        )}

        {!loading && allMessages.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>📭</div>
            <div>No hay mensajes en el historial</div>
          </div>
        )}

        {!loading && allMessages.map((msg) => {
          const isOwn = msg.from_user === currentUser;
          const isPrivate = !!msg.to_user;
          const userObj = getMessageUser(msg);

          let parsedContent = null;
          if (msg.content && typeof msg.content === 'string') {
            try { parsedContent = JSON.parse(msg.content); } catch {}
          }
          const isFile = parsedContent?.type === 'file';
          const f = isFile ? parsedContent : null;

          return (
            <div key={msg.id} style={styles.messageRow(isOwn)}>
              <div style={styles.avatarCol}><Avatar user={userObj} size={32} /></div>
              <div style={styles.bubbleWrap}>
                <div style={styles.bubble(isOwn, isPrivate)}>
                  <div style={styles.header}>
                    <span>
                      <span style={styles.headerName(isOwn)}>{msg.from_user}</span>
                      {isPrivate && <span style={styles.privateTag}>privado</span>}
                    </span>
                    {isAdmin && !isOwn && msg.id && (
                      <button style={styles.deleteBtn} onClick={() => onDelete && onDelete(msg.id)}>✕</button>
                    )}
                  </div>
                  {isFile ? renderFileMsg(f) : (
                    <div style={styles.content}>{msg.content}</div>
                  )}
                  <div style={styles.time}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && hasMore && (
          <div style={styles.loadMoreRow}>
            <button
              style={loadingMore ? styles.loadMoreBtnDisabled : styles.loadMoreBtn}
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Cargando...' : 'Cargar más mensajes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
