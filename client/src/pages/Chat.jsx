import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, onPing } from '../services/socket';
import MessageList from '../components/MessageList';
import UserList from '../components/UserList';
import ChatInput from '../components/ChatInput';
import RoomsPanel from '../components/RoomsPanel';
import RoomView from '../components/RoomView';
import ChannelsPanel from '../components/ChannelsPanel';
import SettingsPanel from '../components/SettingsPanel';
import Avatar from '../components/Avatar';
import ClipboardPanel from '../components/ClipboardPanel';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

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

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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

const isViewingGlobal = (tab, selected, group, room) =>
  tab === 'global' && !selected && !group && !room;

const isViewingPrivate = (selected, tab, group, room, username) =>
  selected?.username === username && tab === 'private' && !group && !room;

const isViewingGroup = (group, selected, room, gid) =>
  group?.id === gid && !selected && !room;

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
  const [sidebarSection, setSidebarSection] = useState('chats');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadGlobal, setUnreadGlobal] = useState(0);
  const [unreadPrivate, setUnreadPrivate] = useState({});
  const [unreadGroups, setUnreadGroups] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [clipboardItems, setClipboardItems] = useState([]);
  const [showClipboard, setShowClipboard] = useState(false);

  useEffect(() => {
    if (settings.notifications && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    setConnected(socket.connected);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('user:info', (info) => {
      if (info.avatar) {
        setUser((prev) => ({ ...prev, avatar: info.avatar }));
      }
    });

    onPing((ms) => setLatency(ms));

    socket.on('message:global', (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!isViewingGlobal(activeTab, selectedUser, activeGroup, activeRoom) && msg.from !== user.username) {
        setUnreadGlobal((prev) => prev + 1);
      }
      if (settings.sound && msg.from !== user.username) playNotificationSound();
      if (settings.notifications && msg.from !== user.username && activeTab !== 'global') {
        showDesktopNotification(msg.from, msg.content);
      }
    });

    socket.on('messages:global', (msgs) => {
      setMessages(msgs);
    });

    socket.on('message:private', (msg) => {
      setPrivateMessages((prev) => {
        const key = [msg.from, msg.to].sort().join(':');
        return { ...prev, [key]: [...(prev[key] || []), msg] };
      });
      if (msg.from !== user.username && !isViewingPrivate(selectedUser, activeTab, activeGroup, activeRoom, msg.from)) {
        setUnreadPrivate((prev) => ({ ...prev, [msg.from]: (prev[msg.from] || 0) + 1 }));
      }
      if (settings.sound && msg.from !== user.username) playNotificationSound();
      if (settings.notifications && msg.from !== user.username) {
        showDesktopNotification(`Privado: ${msg.from}`, msg.content);
      }
    });

    socket.on('messages:private:history', (data) => {
      const key = [data.with, user.username].sort().join(':');
      setPrivateMessages((prev) => ({ ...prev, [key]: data.messages }));
    });

    socket.on('users:update', (users) => {
      setOnlineUsers(users);
    });

    socket.on('file:global', (msg) => {
      if (msg.from === user.username) return;
      setMessages((prev) => [...prev, msg]);
      if (!isViewingGlobal(activeTab, selectedUser, activeGroup, activeRoom)) {
        setUnreadGlobal((prev) => prev + 1);
      }
      if (settings.sound) playNotificationSound();
    });

    socket.on('file:private', (msg) => {
      if (msg.from === user.username) return;
      setPrivateMessages((prev) => {
        const key = [msg.from, msg.to].sort().join(':');
        return { ...prev, [key]: [...(prev[key] || []), msg] };
      });
      if (!isViewingPrivate(selectedUser, activeTab, activeGroup, activeRoom, msg.from)) {
        setUnreadPrivate((prev) => ({ ...prev, [msg.from]: (prev[msg.from] || 0) + 1 }));
      }
      if (settings.sound) playNotificationSound();
    });

    socket.on('message:deleted', (data) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.id));
      setPrivateMessages((prev) => {
        const next = {};
        for (const k in prev) {
          next[k] = prev[k].filter((m) => m.id !== data.id);
        }
        return next;
      });
    });

    socket.on('kicked', (data) => {
      alert(data.message);
      onLogout();
    });

    socket.on('admin:users:list', (users) => {
      setAdminUsers(users);
    });

    socket.on('rooms:list', (list) => {
      setRooms(list);
    });

    socket.on('room:created', (room) => {
      setActiveRoom(room);
      setRoomMessages((prev) => ({ ...prev, [room.id]: room.messages || [] }));
    });

    socket.on('room:joined', (room) => {
      setActiveRoom(room);
      setRoomMessages((prev) => ({ ...prev, [room.id]: room.messages || [] }));
    });

    socket.on('room:updated', (room) => {
      setRooms((prev) => prev.map((r) => r.id === room.id ? room : r));
      setActiveRoom((prev) => prev?.id === room.id ? room : prev);
    });

    socket.on('room:kicked', (data) => {
      if (data.username === user.username) {
        setActiveRoom(null);
      }
    });

    socket.on('room:invited', (data) => {
      if (confirm(`El usuario ${data.by} te ha invitado a la sala "${data.roomName}". ¿Deseas unirte?`)) {
        socket.emit('room:join', { roomId: data.roomId });
      }
    });

    socket.on('room:error', (data) => {
      alert(data.message);
    });

    socket.on('dice:config-update', (data) => {
      setActiveRoom((prev) => {
        if (!prev || prev.id !== data.roomId) return prev;
        return { ...prev, currentDiceConfig: data.counts };
      });
    });

    socket.on('room:message:new', (msg) => {
      setRoomMessages((prev) => {
        const key = msg.roomId;
        if (!key) return prev;
        return { ...prev, [key]: [...(prev[key] || []), msg] };
      });
    });

    socket.on('typing:update', (data) => {
      if (data.from === user.username) return;
      setTypingUsers((prev) => ({ ...prev, [data.from]: data.typing }));
      if (data.typing) {
        setTimeout(() => {
          setTypingUsers((prev) => {
            if (prev[data.from]) {
              return { ...prev, [data.from]: false };
            }
            return prev;
          });
        }, 3000);
      }
    });

    socket.on('groups:list', (list) => {
      setGroups(list);
    });

    socket.on('group:created', (group) => {
      setActiveGroup(group);
      setGroupMessages((prev) => ({ ...prev, [group.id]: group.messages || [] }));
    });

    socket.on('group:joined', (group) => {
      setActiveGroup(group);
      setGroupMessages((prev) => ({ ...prev, [group.id]: group.messages || [] }));
    });

    socket.on('group:invited', (data) => {
      if (confirm(`El usuario ${data.by} te ha invitado al canal "${data.groupName}". ¿Deseas unirte?`)) {
        socket.emit('group:join', { groupId: data.groupId });
      }
    });

    socket.on('group:error', (data) => {
      alert(data.message);
    });

    socket.on('group:message:new', (msg) => {
      setGroupMessages((prev) => {
        const key = msg.groupId;
        if (!key) return prev;
        return { ...prev, [key]: [...(prev[key] || []), msg] };
      });
      if (msg.from !== user.username && !isViewingGroup(activeGroup, selectedUser, activeRoom, msg.groupId)) {
        setUnreadGroups((prev) => ({ ...prev, [msg.groupId]: (prev[msg.groupId] || 0) + 1 }));
      }
      if (settings.sound && msg.from !== user.username) playNotificationSound();
    });

    socket.on('clipboard:shared', (data) => {
      setClipboardItems((prev) => [data, ...prev].slice(0, 50));
      if (settings.notifications) {
        showDesktopNotification(`Clipboard de ${data.from}`, data.content.slice(0, 80));
      }
      if (settings.sound) playNotificationSound();
    });

    socket.emit('room:list');

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('user:info');
      socket.off('message:global');
      socket.off('messages:global');
      socket.off('message:private');
      socket.off('messages:private:history');
      socket.off('users:update');
      socket.off('file:global');
      socket.off('file:private');
      socket.off('message:deleted');
      socket.off('kicked');
      socket.off('admin:users:list');
      socket.off('rooms:list');
      socket.off('room:created');
      socket.off('room:joined');
      socket.off('room:updated');
      socket.off('room:kicked');
      socket.off('room:invited');
      socket.off('room:error');
      socket.off('dice:config-update');
      socket.off('room:message:new');
      socket.off('typing:update');
      socket.off('groups:list');
      socket.off('group:created');
      socket.off('group:joined');
      socket.off('group:invited');
      socket.off('group:error');
      socket.off('group:message:new');
      socket.off('clipboard:shared');
    };
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
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${SERVER_URL}/api/files/upload`, { method: 'POST', body: formData });
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
      alert('Error al subir archivo: ' + err.message);
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

  const updateDiceConfig = useCallback((counts) => {
    if (!activeRoom) return;
    const socket = getSocket();
    if (socket) socket.emit('dice:config', { roomId: activeRoom.id, counts });
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

  const currentPrivateMessages = (() => {
    if (!selectedUser) return [];
    const key = [selectedUser.username, user.username].sort().join(':');
    return privateMessages[key] || [];
  })();

  const currentGroupMessages = (() => {
    if (!activeGroup) return [];
    return groupMessages[activeGroup.id] || [];
  })();

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
      background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)',
      padding: '5px 12px', borderRadius: '8px', cursor: 'pointer',
      fontSize: '12px', fontWeight: 500
    },
    sidebarNav: {
      display: 'flex', borderBottom: '1px solid var(--border)',
      background: 'var(--sidebar-bg)'
    },
    navItem: (active) => ({
      flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
      fontSize: '12px', fontWeight: active ? 600 : 500,
      background: 'transparent', color: active ? 'var(--nav-active)' : 'var(--text-secondary)',
      borderBottom: active ? '2px solid var(--nav-active)' : '2px solid transparent',
      transition: 'all 0.15s'
    }),
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
    adminTitle: { fontSize: '12px', fontWeight: 600, color: 'var(--accent)', marginBottom: '8px' },
    adminUserItem: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', fontSize: '13px', borderBottom: '1px solid var(--border-light)'
    },
    adminBtn: {
      background: 'var(--accent)', border: 'none', color: '#fff',
      padding: '3px 10px', borderRadius: '6px', cursor: 'pointer',
      fontSize: '11px', fontWeight: 600
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
              <button style={styles.iconBtn} onClick={() => { setShowClipboard(!showClipboard); setSidebarSection('chats'); }} title="Portapapeles compartido">📋</button>
              <button style={styles.iconBtn} onClick={() => setShowSettings(true)} title="Configuración">⚙️</button>
              <button style={styles.logoutBtn} onClick={onLogout}>Salir</button>
            </div>
          </div>

          <div style={styles.sidebarNav}>
            <button style={styles.navItem(sidebarSection === 'chats')} onClick={() => setSidebarSection('chats')}>Chats</button>
            <button style={styles.navItem(sidebarSection === 'rooms')} onClick={() => setSidebarSection('rooms')}>Salas</button>
          </div>

          <div style={styles.scrollable}>
            {sidebarSection === 'chats' && (
              <>
                <ChannelsPanel
                  groups={groups}
                  activeGroup={activeGroup}
                  onSelect={selectGroup}
                  onCreate={createGroup}
                  onLeave={leaveGroup}
                  currentUser={user.username}
                  unreadGroups={unreadGroups}
                />
                <UserList
                  users={onlineUsers}
                  currentUser={user.username}
                  selectedUser={selectedUser}
                  onSelect={selectUser}
                  onGlobalClick={handleGlobalClick}
                  activeTab={activeTab}
                  unreadGlobal={unreadGlobal}
                  unreadPrivate={unreadPrivate}
                />
                {user.role === 'admin' && (
                  <div style={styles.adminPanel}>
                    <div style={styles.adminTitle}>
                      Administración
                      <button onClick={loadAdminUsers} style={{ ...styles.adminBtn, marginLeft: '8px', background: 'var(--text-secondary)' }}>↻</button>
                    </div>
                    {adminUsers.map((u) => (
                      <div key={u.id} style={styles.adminUserItem}>
                        <span style={{ color: 'var(--text)' }}>{u.username} <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>({u.role})</span></span>
                        <button style={styles.adminBtn} onClick={() => kickUser(u.username)}>Expulsar</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {sidebarSection === 'rooms' && (
              <RoomsPanel
                rooms={rooms}
                activeRoom={activeRoom}
                onSelect={setActiveRoom}
                onCreate={createRoom}
                onJoin={joinRoom}
                currentUser={user.username}
              />
            )}
            {showClipboard && (
              <ClipboardPanel
                items={clipboardItems}
                onSend={shareClipboard}
                onCopy={sendToClipboard}
                currentUser={user.username}
              />
            )}
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
                <input
                  style={{
                    padding: '6px 12px', border: '1px solid var(--border)',
                    borderRadius: '8px', fontSize: '13px', width: '200px',
                    background: 'var(--input-bg)', color: 'var(--text)', outline: 'none'
                  }}
                  placeholder="Buscar mensajes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
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
    </div>
  );
}
