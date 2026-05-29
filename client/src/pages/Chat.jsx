import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, onPing } from '../services/socket';
import MessageList from '../components/MessageList';
import UserList from '../components/UserList';
import ChatInput from '../components/ChatInput';
import RoomsPanel from '../components/RoomsPanel';
import RoomView from '../components/RoomView';
import GroupsPanel from '../components/GroupsPanel';
import SettingsPanel from '../components/SettingsPanel';
import Avatar from '../components/Avatar';

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
      if (settings.sound) playNotificationSound();
    });

    socket.on('file:private', (msg) => {
      if (msg.from === user.username) return;
      setPrivateMessages((prev) => {
        const key = [msg.from, msg.to].sort().join(':');
        return { ...prev, [key]: [...(prev[key] || []), msg] };
      });
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
      if (confirm(`El usuario ${data.by} te ha invitado al grupo "${data.groupName}". ¿Deseas unirte?`)) {
        socket.emit('group:join', { groupId: data.groupId });
      }
    });

    socket.on('group:message:new', (msg) => {
      setGroupMessages((prev) => {
        const key = msg.groupId;
        if (!key) return prev;
        return { ...prev, [key]: [...(prev[key] || []), msg] };
      });
      if (settings.sound && msg.from !== user.username) playNotificationSound();
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
      socket.off('room:message:new');
      socket.off('typing:update');
      socket.off('groups:list');
      socket.off('group:created');
      socket.off('group:joined');
      socket.off('group:invited');
      socket.off('group:message:new');
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
    const socket = getSocket();
    if (socket && user.role !== 'anonymous') {
      socket.emit('messages:private:history', { with: u.username });
    }
    const key = [u.username, user.username].sort().join(':');
    if (!privateMessages[key]) {
      setPrivateMessages((prev) => ({ ...prev, [key]: [] }));
    }
  }, [user, privateMessages]);

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

  const createRoom = useCallback((name) => {
    const socket = getSocket();
    if (socket) socket.emit('room:create', { name });
  }, []);

  const joinRoom = useCallback((roomId) => {
    const socket = getSocket();
    if (socket) socket.emit('room:join', { roomId });
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

  const createGroup = useCallback((name) => {
    const socket = getSocket();
    if (socket) socket.emit('group:create', { name });
  }, []);

  const selectGroup = useCallback((g) => {
    setActiveGroup(g);
    setActiveTab('group');
    setSelectedUser(null);
    setActiveRoom(null);
    const socket = getSocket();
    if (socket && !g.messages) {
      socket.emit('group:join', { groupId: g.id });
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
      display: 'flex', height: '100vh', overflow: 'hidden'
    },
    sidebar: {
      width: '280px', background: '#16213e', display: 'flex',
      flexDirection: 'column', borderRight: '1px solid #0f3460'
    },
    sidebarHeader: {
      padding: '16px', borderBottom: '1px solid #0f3460',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    userInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
    connectionDot: (isConnected) => ({
      width: '8px', height: '8px', borderRadius: '50%',
      background: isConnected ? '#4ade80' : '#e94560',
      display: 'inline-block', marginLeft: '4px'
    }),
    onlineCount: { fontSize: '13px', color: '#888' },
    latencyText: { fontSize: '11px', color: '#888', marginTop: '2px' },
    logoutBtn: {
      background: 'none', border: '1px solid #e94560', color: '#e94560',
      padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
    },
    settingsBtn: {
      background: 'none', border: 'none', color: '#888',
      cursor: 'pointer', fontSize: '18px', padding: '4px 8px', lineHeight: 1
    },
    main: {
      flex: 1, display: 'flex', flexDirection: 'column'
    },
    header: {
      padding: '16px 24px', background: '#16213e', borderBottom: '1px solid #0f3460',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    headerTitle: { fontSize: '18px', fontWeight: 600 },
    headerSub: { fontSize: '13px', color: '#888' },
    badge: {
      display: 'inline-block', background: '#e94560', color: '#fff',
      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '8px'
    },
    chatArea: {
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0
    },
    adminPanel: {
      padding: '16px', borderTop: '1px solid #0f3460', maxHeight: '200px', overflowY: 'auto'
    },
    adminTitle: { fontSize: '13px', color: '#e94560', marginBottom: '8px', fontWeight: 600 },
    adminUserItem: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '4px 0', fontSize: '13px'
    },
    adminBtn: {
      background: '#0f3460', border: 'none', color: '#eee',
      padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px'
    },
    scrollable: { flex: 1, overflowY: 'auto' },
    headerActions: { display: 'flex', alignItems: 'center', gap: '8px' }
  };

  const otherUser = selectedUser?.username || 'Desconocido';
  const headerTitle = activeGroup ? `💬 ${activeGroup.name}` :
    activeTab === 'global' ? 'Chat Global' : `Privado: ${otherUser}`;
  const headerSub = activeGroup ? `${activeGroup.members.length} miembros` :
    activeTab === 'global' ? 'Todos los usuarios conectados' : `Solo ${otherUser} ve estos mensajes`;

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.userInfo}>
            <Avatar user={user} size={36} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{user.username}</div>
              <div style={styles.onlineCount}>
                <span style={styles.connectionDot(connected)} />
                {' '}{onlineUsers.length} online
                {user.role === 'admin' && <span style={styles.badge}>Admin</span>}
              </div>
              {latency !== null && (
                <div style={styles.latencyText}>{latency}ms</div>
              )}
            </div>
          </div>
          <div>
            <button style={styles.settingsBtn} onClick={() => setShowSettings(true)} title="Configuración">⚙️</button>
            <button style={styles.logoutBtn} onClick={onLogout}>Salir</button>
          </div>
        </div>
        <div style={styles.scrollable}>
          <RoomsPanel
            rooms={rooms}
            activeRoom={activeRoom}
            onSelect={setActiveRoom}
            onCreate={createRoom}
            onJoin={joinRoom}
            currentUser={user.username}
          />
          <GroupsPanel
            groups={groups}
            activeGroup={activeGroup}
            onSelect={selectGroup}
            onCreate={createGroup}
            onLeave={leaveGroup}
            currentUser={user.username}
          />
          <UserList
            users={onlineUsers}
            currentUser={user.username}
            selectedUser={selectedUser}
            onSelect={selectUser}
            onGlobalClick={() => { setActiveTab('global'); setSelectedUser(null); setActiveGroup(null); }}
            activeTab={activeTab}
          />
          {user.role === 'admin' && (
            <div style={styles.adminPanel}>
              <div style={styles.adminTitle}>
                Admin Panel
                <button onClick={loadAdminUsers} style={{ ...styles.adminBtn, marginLeft: '8px' }}>↻</button>
              </div>
              {adminUsers.map((u) => (
                <div key={u.id} style={styles.adminUserItem}>
                  <span>{u.username} ({u.role})</span>
                  <div>
                    <button style={styles.adminBtn} onClick={() => kickUser(u.username)}>Expulsar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
            messages={roomMessages[activeRoom.id] || []}
          />
        ) : (
          <>
            <div style={styles.header}>
              <div>
                <div style={styles.headerTitle}>{headerTitle}</div>
                <div style={styles.headerSub}>{headerSub}</div>
              </div>
              {activeGroup && (
                <button style={{ ...styles.logoutBtn, borderColor: '#4ade80', color: '#4ade80' }} onClick={leaveGroup}>
                  Salir del grupo
                </button>
              )}
            </div>

            <div style={styles.chatArea}>
              <MessageList
                messages={activeTab === 'global' ? messages : activeGroup ? currentGroupMessages : currentPrivateMessages}
                currentUser={user.username}
                isAdmin={user.role === 'admin'}
                onDelete={deleteMessage}
                typingUsers={activeTab === 'global' || (selectedUser && activeTab === 'private') ? typingUsers : undefined}
              />
              <ChatInput
                onSend={sendMessage}
                onFileUpload={handleFileUpload}
                placeholder={activeGroup ? `Mensaje en ${activeGroup.name}...` : activeTab === 'global' ? 'Mensaje global...' : `Mensaje privado para ${otherUser}...`}
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
