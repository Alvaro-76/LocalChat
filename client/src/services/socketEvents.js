import { getSocket, onPing } from './socket';

const isViewingGlobal = (tab, selected, group, room) =>
  tab === 'global' && !selected && !group && !room;

const isViewingPrivate = (selected, tab, group, room, username) =>
  selected?.username === username && tab === 'private' && !group && !room;

const isViewingGroup = (group, selected, room, gid) =>
  group?.id === gid && !selected && !room;

export function setupSocketEvents(ops) {
  const socket = getSocket();
  if (!socket) return () => {};

  ops.setConnected(socket.connected);

  socket.on('connect', () => ops.setConnected(true));
  socket.on('disconnect', () => ops.setConnected(false));
  socket.on('user:info', (info) => {
    if (info.avatar) {
      ops.setUser((prev) => ({ ...prev, avatar: info.avatar }));
    }
  });

  const stopPing = onPing((ms) => ops.setLatency(ms));

  socket.on('message:global', (msg) => {
    ops.setMessages((prev) => [...prev, msg]);
    const v = ops.viewRef.current;
    const s = ops.settingsRef.current;
    const me = ops.userRef.current?.username;
    if (!isViewingGlobal(v.activeTab, v.selectedUser, v.activeGroup, v.activeRoom) && msg.from !== me) {
      ops.setUnreadGlobal((prev) => prev + 1);
    }
    if (s.sound && msg.from !== me) ops.playNotificationSound();
    if (s.notifications && msg.from !== me && v.activeTab !== 'global') {
      ops.showDesktopNotification(msg.from, msg.content);
    }
  });

  socket.on('messages:global', (msgs) => {
    ops.setMessages(msgs);
    ops.setMessagesLoading(false);
  });

  socket.on('message:private', (msg) => {
    ops.setPrivateMessages((prev) => {
      const key = [msg.from, msg.to].sort().join(':');
      return { ...prev, [key]: [...(prev[key] || []), msg] };
    });
    const v = ops.viewRef.current;
    const s = ops.settingsRef.current;
    const me = ops.userRef.current?.username;
    if (msg.from !== me && !isViewingPrivate(v.selectedUser, v.activeTab, v.activeGroup, v.activeRoom, msg.from)) {
      ops.setUnreadPrivate((prev) => ({ ...prev, [msg.from]: (prev[msg.from] || 0) + 1 }));
    }
    if (s.sound && msg.from !== me) ops.playNotificationSound();
    if (s.notifications && msg.from !== me) {
      ops.showDesktopNotification(`Privado: ${msg.from}`, msg.content);
    }
  });

  socket.on('messages:private:history', (data) => {
    const me = ops.userRef.current?.username;
    const key = [data.with, me].sort().join(':');
    ops.setPrivateMessages((prev) => {
      const existing = prev[key];
      if (!existing || existing.length === 0) return { ...prev, [key]: data.messages };
      const existingIds = new Set(existing.filter(m => m.id).map(m => m.id));
      const merged = [...data.messages.filter(m => !existingIds.has(m.id)), ...existing];
      return { ...prev, [key]: merged };
    });
  });

  socket.on('users:update', (users) => {
    ops.setOnlineUsers(users);
  });

  socket.on('file:global', (msg) => {
    const me = ops.userRef.current?.username;
    if (msg.from === me) return;
    ops.setMessages((prev) => [...prev, msg]);
    const v = ops.viewRef.current;
    if (!isViewingGlobal(v.activeTab, v.selectedUser, v.activeGroup, v.activeRoom)) {
      ops.setUnreadGlobal((prev) => prev + 1);
    }
    if (ops.settingsRef.current.sound) ops.playNotificationSound();
  });

  socket.on('file:private', (msg) => {
    const me = ops.userRef.current?.username;
    if (msg.from === me) return;
    ops.setPrivateMessages((prev) => {
      const key = [msg.from, msg.to].sort().join(':');
      return { ...prev, [key]: [...(prev[key] || []), msg] };
    });
    const v = ops.viewRef.current;
    if (!isViewingPrivate(v.selectedUser, v.activeTab, v.activeGroup, v.activeRoom, msg.from)) {
      ops.setUnreadPrivate((prev) => ({ ...prev, [msg.from]: (prev[msg.from] || 0) + 1 }));
    }
    if (ops.settingsRef.current.sound) ops.playNotificationSound();
  });

  socket.on('message:deleted', (data) => {
    ops.setMessages((prev) => prev.filter((m) => m.id !== data.id));
    ops.setPrivateMessages((prev) => {
      const next = {};
      for (const k in prev) {
        next[k] = prev[k].filter((m) => m.id !== data.id);
      }
      return next;
    });
  });

  socket.on('kicked', (data) => {
    ops.setAlertMessage(data.message);
    ops.setAlertModalOpen(true);
    ops.onLogout();
  });

  socket.on('admin:users:list', (users) => {
    ops.setAdminUsers(users);
  });

  socket.on('rooms:list', (list) => {
    ops.setRooms(list);
  });

  socket.on('room:created', (room) => {
    ops.setActiveRoom(room);
    ops.setRoomMessages((prev) => ({ ...prev, [room.id]: room.messages || [] }));
  });

  socket.on('room:joined', (room) => {
    ops.setActiveRoom(room);
    ops.setRoomMessages((prev) => ({ ...prev, [room.id]: room.messages || [] }));
  });

  socket.on('room:updated', (room) => {
    ops.setRooms((prev) => prev.map((r) => r.id === room.id ? room : r));
    ops.setActiveRoom((prev) => prev?.id === room.id ? room : prev);
  });

  socket.on('room:kicked', (data) => {
    const me = ops.userRef.current?.username;
    if (data.username === me) {
      ops.setActiveRoom(null);
    }
  });

  socket.on('room:invited', (data) => {
    ops.setInviteData({ type: 'sala', from: data.by, name: data.roomName, id: data.roomId });
    ops.setInviteModalOpen(true);
  });

  socket.on('room:error', (data) => {
    ops.setAlertMessage(data.message);
    ops.setAlertModalOpen(true);
  });

  socket.on('dice:config-update', (data) => {
    ops.setActiveRoom((prev) => {
      if (!prev || prev.id !== data.roomId) return prev;
      return { ...prev, currentDiceConfig: data.counts };
    });
  });

  socket.on('room:message:new', (msg) => {
    ops.setRoomMessages((prev) => {
      const key = msg.roomId;
      if (!key) return prev;
      return { ...prev, [key]: [...(prev[key] || []), msg] };
    });
    ops.setUnreadRooms((prev) => prev + 1);
  });

  socket.on('typing:update', (data) => {
    const me = ops.userRef.current?.username;
    if (data.from === me) return;
    ops.setTypingUsers((prev) => ({ ...prev, [data.from]: data.typing }));
    if (data.typing) {
      setTimeout(() => {
        ops.setTypingUsers((prev) => {
          if (prev[data.from]) {
            return { ...prev, [data.from]: false };
          }
          return prev;
        });
      }, 3000);
    }
  });

  socket.on('groups:list', (list) => {
    ops.setGroups(list);
  });

  socket.on('group:created', (group) => {
    ops.setActiveGroup(group);
    ops.setGroupMessages((prev) => ({ ...prev, [group.id]: group.messages || [] }));
  });

  socket.on('group:joined', (group) => {
    ops.setActiveGroup(group);
    ops.setGroupMessages((prev) => ({ ...prev, [group.id]: group.messages || [] }));
  });

  socket.on('group:invited', (data) => {
    ops.setInviteData({ type: 'canal', from: data.by, name: data.groupName, id: data.groupId });
    ops.setInviteModalOpen(true);
  });

  socket.on('group:error', (data) => {
    ops.setAlertMessage(data.message);
    ops.setAlertModalOpen(true);
  });

  socket.on('group:message:new', (msg) => {
    ops.setGroupMessages((prev) => {
      const key = msg.groupId;
      if (!key) return prev;
      return { ...prev, [key]: [...(prev[key] || []), msg] };
    });
    const v = ops.viewRef.current;
    const me = ops.userRef.current?.username;
    const s = ops.settingsRef.current;
    if (msg.from !== me && !isViewingGroup(v.activeGroup, v.selectedUser, v.activeRoom, msg.groupId)) {
      ops.setUnreadGroups((prev) => ({ ...prev, [msg.groupId]: (prev[msg.groupId] || 0) + 1 }));
    }
    if (s.sound && msg.from !== me) ops.playNotificationSound();
  });

  socket.on('clipboard:shared', (data) => {
    ops.setClipboardItems((prev) => [data, ...prev].slice(0, 50));
    const s = ops.settingsRef.current;
    if (s.notifications) {
      ops.showDesktopNotification(`Clipboard de ${data.from}`, data.content.slice(0, 80));
    }
    if (s.sound) ops.playNotificationSound();
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
    if (stopPing) stopPing();
  };
}
