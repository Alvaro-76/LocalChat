import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getSocket } from '../services/socket';
import MessageList from '../components/MessageList';
import UserList from '../components/UserList';
import ChatInput from '../components/ChatInput';
import RoomsPanel from '../components/RoomsPanel';
import RoomView from '../components/RoomView';
import ChannelsPanel from '../components/ChannelsPanel';
import SettingsPanel from '../components/SettingsPanel';
import Avatar from '../components/Avatar';

import { SERVER_URL } from '../services/config';
import { InviteModal, ConfirmModal } from '../components/Modal';
import { setupSocketEvents } from '../services/socketEvents';

const DEFAULT_SETTINGS = {
  sound: true,
  notifications: true
};

function loadSettings() {
  try {
    const saved = localStorage.getItem('localchat_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings) {
  localStorage.setItem('localchat_settings', JSON.stringify(settings));
}

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {}
  }
  return audioCtx;
}

function playNotificationSound() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

function showDesktopNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

export default function Chat({ user: initialUser, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [privateMessages, setPrivateMessages] = useState({});
  const [activeTab, setActiveTab] = useState('global');
  const [adminUsers, setAdminUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [roomMessages, setRoomMessages] = useState({});
  const [connected, setConnected] = useState(true);
  const [latency, setLatency] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(loadSettings);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadGlobal, setUnreadGlobal] = useState(0);
  const [unreadPrivate, setUnreadPrivate] = useState({});
  const [unreadGroups, setUnreadGroups] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [clipboardItems, setClipboardItems] = useState([]);
  const [clipboardExpanded, setClipboardExpanded] = useState(false);
  const [unreadRooms, setUnreadRooms] = useState(0);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const userRef = useRef(user);
  userRef.current = user;
  const viewRef = useRef({ activeTab, selectedUser, activeGroup, activeRoom });
  viewRef.current = { activeTab, selectedUser, activeGroup, activeRoom };

  useEffect(() => {
    if (settings.notifications && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    setConnected(socket.connected);

    const cleanup = setupSocketEvents({
      setConnected,
      setLatency,
      setUser,
      setMessages,
      setMessagesLoading,
      setPrivateMessages,
      setUnreadGlobal,
      setUnreadPrivate,
      setOnlineUsers,
      setAdminUsers,
      setRooms,
      setActiveRoom,
      setRoomMessages,
      setUnreadRooms,
      setTypingUsers,
      setGroups,
      setActiveGroup,
      setGroupMessages,
      setUnreadGroups,
      setClipboardItems,
      setInviteData,
      setInviteModalOpen,
      setAlertMessage,
      setAlertModalOpen,
      viewRef,
      userRef,
      settingsRef,
      user,
      onLogout,
      playNotificationSound,
      showDesktopNotification,
    });

    socket.emit('room:list');

    return cleanup;
  }, []);

  const sendMessage = useCallback((content) => {
    const socket = getSocket();
    if (!socket) return;

    if (activeGroup) {
      socket.emit('group:message', { groupId: activeGroup.id, content });
    } else if (activeTab === 'global') {
      socket.emit('message:global', { content });
    } else if (selectedUser) {
      socket.emit('message:private', { to: selectedUser.username, content });
    }
  }, [activeTab, selectedUser, activeGroup]);

  const tempIdRef = useRef(0);
  const handleFileUpload = useCallback(async (file) => {
    const socket = getSocket();
    if (!socket) return;

    const tempId = `upload_${++tempIdRef.current}`;
    const tempMsg = {
      _uploading: true, _tempId: tempId,
      _file: { name: file.name, size: file.size },
      from: user.username,
      timestamp: new Date().toISOString()
    };

    const addTemp = activeTab === 'global' || !selectedUser
      ? (prev) => [...prev, tempMsg]
      : (prev) => {
          const key = [selectedUser.username, user.username].sort().join(':');
          return { ...prev, [key]: [...(prev[key] || []), tempMsg] };
        };
    const removeTemp = (prev) => {
      if (activeTab === 'global' || !selectedUser) {
        return prev.filter((m) => m._tempId !== tempId);
      }
      const next = { ...prev };
      const key = [selectedUser.username, user.username].sort().join(':');
      next[key] = (next[key] || []).filter((m) => m._tempId !== tempId);
      return next;
    };

    if (activeTab === 'global' || !selectedUser) {
      setMessages(addTemp);
    } else {
      setPrivateMessages(addTemp);
    }

    try {
      if (!user.token) {
        throw new Error('Debes registrarte para enviar archivos');
      }
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${SERVER_URL}/api/files/upload`, {
        method: 'POST', body: formData,
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.status === 401) throw new Error('Debes registrarte para enviar archivos');
      if (!res.ok) throw new Error('Error al subir archivo');
      const data = await res.json();

      if (activeTab === 'global' || !selectedUser) {
        socket.emit('file:global', data);
      } else {
        socket.emit('file:private', { ...data, to: selectedUser.username });
      }

      const realMsg = {
        type: 'file', fileId: data.fileId, fileName: data.fileName,
        fileSize: data.fileSize, mimeType: data.mimeType,
        from: user.username, timestamp: new Date().toISOString()
      };

      if (activeTab === 'global' || !selectedUser) {
        setMessages((prev) => [...prev.filter((m) => m._tempId !== tempId), realMsg]);
      } else {
        setPrivateMessages((prev) => {
          const key = [selectedUser.username, user.username].sort().join(':');
          const arr = (prev[key] || []).filter((m) => m._tempId !== tempId);
          return { ...prev, [key]: [...arr, realMsg] };
        });
      }
    } catch (err) {
      if (activeTab === 'global' || !selectedUser) {
        setMessages(removeTemp);
      } else {
        setPrivateMessages(removeTemp);
      }
      setAlertMessage('Error al subir archivo: ' + err.message);
      setAlertModalOpen(true);
    }
  }, [activeTab, selectedUser, user.username]);

  const selectUser = useCallback((u) => {
    setSelectedUser(u);
    setActiveTab('private');
    setActiveGroup(null);
    setActiveRoom(null);
    setUnreadPrivate((prev) => ({ ...prev, [u.username]: 0 }));
    const socket = getSocket();
    if (socket && user.role !== 'anonymous') {
      socket.emit('messages:private:history', { with: u.username });
    }
    const key = [u.username, user.username].sort().join(':');
    if (!privateMessages[key]) {
      setPrivateMessages((prev) => ({ ...prev, [key]: [] }));
    }
  }, [user, privateMessages]);

  const handleGlobalClick = useCallback(() => {
    setActiveTab('global');
    setSelectedUser(null);
    setActiveGroup(null);
    setActiveRoom(null);
    setUnreadGlobal(0);
  }, []);

  const deleteMessage = useCallback((messageId) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('admin:delete:message', { messageId });
    }
  }, []);

  const kickUser = useCallback((username) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('admin:kick', { username });
    }
  }, []);

  const loadAdminUsers = useCallback(() => {
    const socket = getSocket();
    if (socket) {
      socket.emit('admin:get:users');
    }
  }, []);

  const createRoom = useCallback((name, password) => {
    const socket = getSocket();
    if (socket) socket.emit('room:create', { name, password });
  }, []);

  const joinRoom = useCallback((roomId, password) => {
    const socket = getSocket();
    if (socket) socket.emit('room:join', { roomId, password });
  }, []);

  const leaveRoom = useCallback(() => {
    if (!activeRoom) return;
    const socket = getSocket();
    if (socket) socket.emit('room:leave', { roomId: activeRoom.id });
    setActiveRoom(null);
  }, [activeRoom]);

  const reorderPlayers = useCallback((players) => {
    if (!activeRoom) return;
    const socket = getSocket();
    if (socket) socket.emit('room:reorder', { roomId: activeRoom.id, players });
  }, [activeRoom]);

  const nextTurn = useCallback(() => {
    if (!activeRoom) return;
    const socket = getSocket();
    if (socket) socket.emit('room:next-turn', { roomId: activeRoom.id });
  }, [activeRoom]);

  const setTurn = useCallback((username) => {
    if (!activeRoom) return;
    const socket = getSocket();
    if (socket) socket.emit('room:set-turn', { roomId: activeRoom.id, username });
  }, [activeRoom]);

  const kickFromRoom = useCallback((username) => {
    if (!activeRoom) return;
    const socket = getSocket();
    if (socket) socket.emit('room:kick', { roomId: activeRoom.id, username });
  }, [activeRoom]);

  const inviteToRoom = useCallback((username) => {
    if (!activeRoom) return;
    const socket = getSocket();
    if (socket) socket.emit('room:invite', { roomId: activeRoom.id, username });
  }, [activeRoom]);

  const handleRoomMessage = useCallback((content) => {
    if (!activeRoom) return;
    const socket = getSocket();
    if (socket) socket.emit('room:message', { roomId: activeRoom.id, content });
  }, [activeRoom]);

  const rollDice = useCallback((config) => {
    if (!activeRoom) return;
    const socket = getSocket();
    if (socket) socket.emit('dice:roll', { roomId: activeRoom.id, ...config });
  }, [activeRoom]);

  const updateDiceConfig = useCallback((counts, explosive) => {
    if (!activeRoom) return;
    const socket = getSocket();
    if (socket) socket.emit('dice:config', { roomId: activeRoom.id, counts, explosive });
  }, [activeRoom]);

  const createGroup = useCallback((name, password) => {
    const socket = getSocket();
    if (socket) socket.emit('group:create', { name, password });
  }, []);

  const selectGroup = useCallback((g, password) => {
    setActiveGroup(g);
    setActiveTab('group');
    setSelectedUser(null);
    setActiveRoom(null);
    setUnreadGroups((prev) => ({ ...prev, [g.id]: 0 }));
    const socket = getSocket();
    if (socket) {
      if (g.hasPassword) {
        socket.emit('group:join', { groupId: g.id, password: password || '' });
      } else {
        socket.emit('group:join', { groupId: g.id });
      }
    }
    if (!groupMessages[g.id]) {
      setGroupMessages((prev) => ({ ...prev, [g.id]: [] }));
    }
  }, [groupMessages]);

  const leaveGroup = useCallback(() => {
    if (!activeGroup) return;
    const socket = getSocket();
    if (socket) socket.emit('group:leave', { groupId: activeGroup.id });
    setActiveGroup(null);
  }, [activeGroup]);

  const shareClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const socket = getSocket();
      if (socket) socket.emit('clipboard:share', { content: text });
    } catch {}
  }, []);

  const sendToClipboard = useCallback((content) => {
    navigator.clipboard.writeText(content).catch(() => {});
  }, []);

  const handleSettingsUpdate = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  }, []);

  const currentPrivateMessages = useMemo(() => {
    if (!selectedUser) return [];
    const key = [selectedUser.username, user.username].sort().join(':');
    return privateMessages[key] || [];
  }, [selectedUser, user.username, privateMessages]);

  const currentGroupMessages = useMemo(() => {
    if (!activeGroup) return [];
    return groupMessages[activeGroup.id] || [];
  }, [activeGroup, groupMessages]);

  const styles = {
    container: {
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: 'var(--bg)'
    },
    sidebar: {
      width: sidebarOpen ? '320px' : '0px',
      background: 'var(--sidebar-bg)', display: 'flex',
      flexDirection: 'column', borderRight: sidebarOpen ? '1px solid var(--border)' : 'none',
      flexShrink: 0, overflow: 'hidden',
      transition: 'width 0.3s ease, border-right 0.3s ease'
    },
    sidebarInner: {
      width: '320px', height: '100%', display: 'flex',
      flexDirection: 'column', flexShrink: 0
    },
    sidebarToggle: {
      position: 'fixed', left: sidebarOpen ? '320px' : '0',
      top: '50%', transform: 'translateY(-50%)',
      zIndex: 100,
      width: '24px', height: '48px',
      background: 'var(--sidebar-bg)',
      border: '1px solid var(--border)',
      borderLeft: 'none',
      borderRadius: '0 8px 8px 0',
      cursor: 'pointer', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '12px', color: 'var(--text-secondary)',
      transition: 'left 0.3s ease',
      boxShadow: '2px 0 8px var(--shadow)'
    },
    sidebarHeader: {
      padding: '14px 16px', borderBottom: '1px solid var(--sidebar-header-border)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: 'var(--sidebar-bg)'
    },
    userInfo: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 },
    userName: { fontSize: '14px', fontWeight: 600, color: 'var(--text)' },
    userStatusRow: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' },
    connectionDot: (isConnected) => ({
      width: '8px', height: '8px', borderRadius: '50%',
      background: isConnected ? 'var(--online-dot)' : 'var(--danger)',
      display: 'inline-block'
    }),
    latencyText: { fontSize: '10px', color: 'var(--text-muted)' },
    sidebarActions: { display: 'flex', alignItems: 'center', gap: '4px' },
    iconBtn: {
      background: 'none', border: 'none', color: 'var(--text-secondary)',
      cursor: 'pointer', fontSize: '18px', padding: '6px',
      lineHeight: 1, borderRadius: '8px', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.15s'
    },
    logoutBtn: {
      background: 'var(--danger)', border: 'none', color: '#fff',
      padding: '5px 12px', borderRadius: '8px', cursor: 'pointer',
      fontSize: '12px', fontWeight: 600, transition: 'opacity 0.15s'
    },
    sectionDivider: {
      height: '1px', background: 'var(--border)', margin: '8px 16px', flexShrink: 0
    },
    scrollable: { flex: 1, overflowY: 'auto', background: 'var(--sidebar-bg)' },
    main: {
      flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0
    },
    header: {
      padding: '14px 24px', background: 'var(--header-bg)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    headerTitle: { fontSize: '16px', fontWeight: 600, color: 'var(--text)' },
    headerSub: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' },
    badge: {
      display: 'inline-block', background: 'var(--badge-bg)', color: 'var(--badge-text)',
      padding: '1px 8px', borderRadius: '4px', fontSize: '10px',
      fontWeight: 600, marginLeft: '8px'
    },
    chatArea: {
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0
    },
    adminPanel: {
      padding: '12px 16px', borderTop: '1px solid var(--border)',
      background: 'var(--surface-hover)'
    },
    adminTitle: { fontSize: '13px', fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' },
    adminSubtitle: { fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' },
    adminUserItem: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', fontSize: '13px', borderBottom: '1px solid var(--border-light)'
    },
    adminBtn: {
      background: 'var(--accent)', border: 'none', color: '#fff',
      padding: '3px 10px', borderRadius: '6px', cursor: 'pointer',
      fontSize: '11px', fontWeight: 600, transition: 'opacity 0.15s'
    }
  };

  const otherUser = selectedUser?.username || 'Desconocido';
  const headerTitle = activeGroup ? `# ${activeGroup.name}` :
    activeRoom ? `🎲 ${activeRoom.name}` :
    activeTab === 'global' ? 'General' : otherUser;
  const headerSub = activeGroup ? `${activeGroup.members?.length || 0} miembros` :
    activeRoom ? `${activeRoom.players.length} jugadores` :
    activeTab === 'global' ? 'Chat global en la red local' : `Mensaje privado`;

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarInner}>
          <div style={styles.sidebarHeader}>
            <div style={styles.userInfo}>
              <Avatar user={user} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.userName}>{user.username}</div>
                <div style={styles.userStatusRow}>
                  <span style={styles.connectionDot(connected)} />
                  <span>{connected ? 'Conectado' : 'Desconectado'}</span>
                  {latency !== null && <span style={styles.latencyText}>· {latency}ms</span>}
                  {user.role === 'admin' && <span style={styles.badge}>Admin</span>}
                </div>
              </div>
            </div>
            <div style={styles.sidebarActions}>
              <button style={styles.iconBtn} onClick={() => setShowSettings(true)} title="Configuración">⚙️</button>
              <button style={styles.logoutBtn} onClick={onLogout}>Salir</button>
            </div>
          </div>

          <div style={styles.scrollable}>
            <ChannelsPanel
              groups={groups}
              activeGroup={activeGroup}
              onSelect={selectGroup}
              onCreate={createGroup}
              onLeave={leaveGroup}
              currentUser={user.username}
              unreadGroups={unreadGroups}
              globalActive={activeTab === 'global' && !activeGroup && !activeRoom}
              onGlobalClick={handleGlobalClick}
              unreadGlobal={unreadGlobal}
              onlineUsersCount={onlineUsers.length}
            />
            <UserList
              users={onlineUsers}
              currentUser={user.username}
              selectedUser={selectedUser}
              onSelect={selectUser}
              unreadPrivate={unreadPrivate}
            />

            {user.role === 'admin' && (
                  <div style={styles.adminPanel}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div>
                        <div style={styles.adminTitle}>Panel de administración</div>
                        <div style={styles.adminSubtitle}>Usuarios del servidor</div>
                      </div>
                      <button onClick={loadAdminUsers} style={{ ...styles.adminBtn, background: 'var(--text-secondary)' }}>
                        ↻ Cargar
                      </button>
                    </div>
                    {adminUsers.length === 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px 0' }}>
                        Presiona ↻ Cargar para ver los usuarios
                      </div>
                    )}
                    {adminUsers.map((u) => (
                      <div key={u.username} style={styles.adminUserItem}>
                        <div>
                          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{u.username}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '11px', marginLeft: '6px' }}>
                            {u.role === 'admin' ? 'Admin' : u.isRegistered ? 'Registrado' : 'Invitado'}
                          </span>
                        </div>
                        {u.username !== user.username && (
                          <button style={{ ...styles.adminBtn, background: 'var(--danger)' }} onClick={() => kickUser(u.username)}>
                            Expulsar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            <div style={styles.sectionDivider} />
            <div style={{borderBottom: '1px solid var(--border)'}}>
              <RoomsPanel
                rooms={rooms}
                activeRoom={activeRoom}
                onSelect={setActiveRoom}
                onCreate={createRoom}
                onJoin={joinRoom}
                currentUser={user.username}
              />
            </div>

          </div>
        </div>
      </div>

      <button style={styles.sidebarToggle} onClick={() => setSidebarOpen(!sidebarOpen)} title={sidebarOpen ? 'Ocultar panel' : 'Mostrar panel'}>
        {sidebarOpen ? '◀' : '▶'}
      </button>

      <div style={styles.main}>
        {activeRoom ? (
          <RoomView
            room={activeRoom}
            currentUser={user.username}
            onRoll={rollDice}
            onLeave={leaveRoom}
            onReorder={reorderPlayers}
            onNextTurn={nextTurn}
            onKick={kickFromRoom}
            onInvite={inviteToRoom}
            onMessage={handleRoomMessage}
            onConfigChange={updateDiceConfig}
            messages={roomMessages[activeRoom.id] || []}
          />
        ) : (
          <>
            <div style={styles.header}>
              <div>
                <div style={styles.headerTitle}>{headerTitle}</div>
                <div style={styles.headerSub}>{headerSub}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    style={{
                      padding: '6px 12px', border: '1px solid var(--border)',
                      borderRadius: '8px', fontSize: '13px', width: '200px',
                      paddingRight: searchQuery ? '28px' : '12px',
                      background: 'var(--input-bg)', color: 'var(--text)', outline: 'none'
                    }}
                    placeholder="Buscar mensajes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute', right: '6px', top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '14px', color: 'var(--text-muted)', padding: '4px',
                        lineHeight: 1, borderRadius: '4px'
                      }}
                      title="Limpiar búsqueda"
                    >✕</button>
                  )}
                </div>
                {searchQuery && (() => {
                  const filtered = (activeTab === 'global' ? messages : activeGroup ? currentGroupMessages : currentPrivateMessages)
                    .filter((m) => (m.content || '').toLowerCase().includes(searchQuery.toLowerCase()));
                  const count = filtered.length;
                  return (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {count} resultado{count !== 1 ? 's' : ''}
                    </span>
                  );
                })()}
                {activeGroup && (
                  <button style={{
                    padding: '6px 14px', border: '2px solid var(--danger)',
                    borderRadius: '20px', background: 'transparent',
                    color: 'var(--danger)', cursor: 'pointer', fontSize: '12px',
                    fontWeight: 600
                  }} onClick={leaveGroup}>
                    Salir del canal
                  </button>
                )}
              </div>
            </div>

            <div style={styles.chatArea}>
              <MessageList
                messages={(activeTab === 'global' ? messages : activeGroup ? currentGroupMessages : currentPrivateMessages)
                  .filter((m) => !searchQuery || (m.content || '').toLowerCase().includes(searchQuery.toLowerCase()))}
                currentUser={user.username}
                isAdmin={user.role === 'admin'}
                onDelete={deleteMessage}
                typingUsers={activeTab === 'global' || (selectedUser && activeTab === 'private') ? typingUsers : undefined}
                loading={messagesLoading && activeTab === 'global' && messages.length === 0}
                searchQuery={searchQuery}
              />
              <ChatInput
                onSend={sendMessage}
                onFileUpload={handleFileUpload}
                placeholder={activeGroup ? `Mensaje en #${activeGroup.name}...` : activeTab === 'global' ? 'Escribe un mensaje...' : `Mensaje privado...`}
                typingTo={activeTab === 'global' ? null : selectedUser?.username}
              />
            </div>
          </>
        )}
      </div>

      {showSettings && (
        <SettingsPanel
          user={user}
          settings={settings}
          onUpdateSettings={handleSettingsUpdate}
          onClose={() => setShowSettings(false)}
          onAvatarChange={(avatar) => setUser((prev) => ({ ...prev, avatar }))}
        />
      )}

      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => { setInviteModalOpen(false); setInviteData(null); }}
        onConfirm={() => {
          const socket = getSocket();
          if (socket && inviteData) {
            if (inviteData.type === 'sala') {
              socket.emit('room:join', { roomId: inviteData.id });
            } else {
              socket.emit('group:join', { groupId: inviteData.id });
            }
          }
          setInviteModalOpen(false);
          setInviteData(null);
        }}
        from={inviteData?.from || ''}
        name={inviteData?.name || ''}
        type={inviteData?.type || 'canal'}
      />

      <ConfirmModal
        isOpen={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
        onConfirm={() => setAlertModalOpen(false)}
        title="Aviso"
        message={alertMessage}
        confirmText="Entendido"
      />
    </div>
  );
}
