const db = require('../db/database');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

const onlineUsers = new Map();
const SERVER_URL = process.env.SERVER_URL || '';

const groups = new Map();
let nextGroupId = 1;

function setupSocket(io) {
  io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('user:join', (data) => {
      const { username, token } = data;
      let user = { username, role: 'anonymous', id: null };
      socket.data.user = user;

      if (token) {
        try {
          const decoded = verifyToken(token);
          user = decoded;
        } catch {
          socket.emit('error', { message: 'Token inválido, modo invitado' });
        }
      }

      const registeredUser = db.getUser(user.username);
      let avatar = { type: 'color', color: db.stringToColor(user.username) };
      if (registeredUser && registeredUser.avatar) {
        avatar = registeredUser.avatar;
      }

      currentUser = user;
      currentUser.avatar = avatar;
      onlineUsers.set(socket.id, currentUser);
      io.emit('users:update', Array.from(onlineUsers.values()));
      socket.emit('user:info', { ...currentUser });
      socket.emit('messages:global', db.getGlobalMessages());
      socket.emit('groups:list', getGroupsForUser(user.username));
    });

    socket.on('message:global', (data) => {
      if (!currentUser) return;

      const msg = {
        from: currentUser.username,
        content: data.content.slice(0, 500),
        timestamp: new Date().toISOString()
      };

      const isPersistent = currentUser.role !== 'anonymous';
      if (isPersistent) {
        const saved = db.saveMessage(currentUser.username, null, msg.content, true);
        msg.id = saved.id;
      }

      io.emit('message:global', { ...msg, id: msg.id });
    });

    socket.on('message:private', (data) => {
      if (!currentUser) return;

      const { to, content } = data;
      const sanitized = content.slice(0, 500);
      const isPersistent = currentUser.role !== 'anonymous';

      let saved = null;
      if (isPersistent) {
        saved = db.saveMessage(currentUser.username, to, sanitized, true);
      }

      const msg = {
        from: currentUser.username,
        content: sanitized,
        timestamp: new Date().toISOString(),
        to
      };
      if (saved) msg.id = saved.id;

      let targetSocketId = null;
      for (const [sid, u] of onlineUsers) {
        if (u.username === to) {
          targetSocketId = sid;
          break;
        }
      }

      socket.emit('message:private', msg);
      if (targetSocketId) {
        socket.to(targetSocketId).emit('message:private', msg);
      }
    });

    socket.on('file:global', (data) => {
      if (!currentUser) return;
      const msg = {
        type: 'file',
        fileId: data.fileId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        from: currentUser.username,
        timestamp: new Date().toISOString()
      };
      const isPersistent = currentUser.role !== 'anonymous';
      if (isPersistent) {
        const saved = db.saveMessage(currentUser.username, null, JSON.stringify(msg), true);
        msg.id = saved.id;
      }
      io.emit('file:global', msg);
    });

    socket.on('file:private', (data) => {
      if (!currentUser) return;
      const msg = {
        type: 'file',
        fileId: data.fileId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        from: currentUser.username,
        to: data.to,
        timestamp: new Date().toISOString()
      };
      const isPersistent = currentUser.role !== 'anonymous';
      if (isPersistent) {
        const saved = db.saveMessage(currentUser.username, data.to, JSON.stringify(msg), true);
        msg.id = saved.id;
      }
      let targetSocketId = null;
      for (const [sid, u] of onlineUsers) {
        if (u.username === data.to) {
          targetSocketId = sid;
          break;
        }
      }
      socket.emit('file:private', msg);
      if (targetSocketId) {
        socket.to(targetSocketId).emit('file:private', msg);
      }
    });

    socket.on('messages:private:history', (data) => {
      if (!currentUser || currentUser.role === 'anonymous') return;
      const { with: otherUser } = data;
      const messages = db.getDMs(currentUser.username, otherUser);
      socket.emit('messages:private:history', { with: otherUser, messages });
    });

    socket.on('admin:delete:message', (data) => {
      if (!currentUser || currentUser.role !== 'admin') return;
      const { messageId } = data;
      db.deleteMessage(messageId);
      io.emit('message:deleted', { id: messageId });
    });

    socket.on('admin:kick', (data) => {
      if (!currentUser || currentUser.role !== 'admin') return;
      const { username } = data;
      for (const [sid, u] of onlineUsers) {
        if (u.username === username) {
          io.to(sid).emit('kicked', { message: 'Has sido expulsado por un administrador' });
          socket.to(sid).disconnectSockets(true);
          break;
        }
      }
    });

    socket.on('admin:get:users', () => {
      if (!currentUser || currentUser.role !== 'admin') return;
      socket.emit('admin:users:list', db.getAllUsers());
    });

    socket.on('typing:start', (data) => {
      if (!currentUser) return;
      const { to } = data;
      if (to) {
        let targetSocketId = null;
        for (const [sid, u] of onlineUsers) {
          if (u.username === to) {
            targetSocketId = sid;
            break;
          }
        }
        if (targetSocketId) {
          socket.to(targetSocketId).emit('typing:update', { from: currentUser.username, typing: true });
        }
      } else {
        socket.broadcast.emit('typing:update', { from: currentUser.username, typing: true });
      }
    });

    socket.on('typing:stop', (data) => {
      if (!currentUser) return;
      const { to } = data;
      if (to) {
        let targetSocketId = null;
        for (const [sid, u] of onlineUsers) {
          if (u.username === to) {
            targetSocketId = sid;
            break;
          }
        }
        if (targetSocketId) {
          socket.to(targetSocketId).emit('typing:update', { from: currentUser.username, typing: false });
        }
      } else {
        socket.broadcast.emit('typing:update', { from: currentUser.username, typing: false });
      }
    });

    socket.on('ping:measure', () => {
      socket.emit('pong:measure', { time: Date.now() });
    });

    socket.on('group:create', (data) => {
      if (!currentUser) return;
      const { name } = data;
      if (!name || !name.trim()) return;
      const id = nextGroupId++;
      const group = {
        id,
        name: name.trim(),
        admin: currentUser.username,
        members: [currentUser.username],
        messages: []
      };
      groups.set(id, group);
      io.emit('groups:list', getGroupsForUser(currentUser.username));
      socket.emit('group:created', group);
    });

    socket.on('group:invite', (data) => {
      if (!currentUser) return;
      const { groupId, username } = data;
      const group = groups.get(groupId);
      if (!group || group.admin !== currentUser.username) return;
      if (group.members.includes(username)) return;

      let targetSocketId = null;
      for (const [sid, u] of onlineUsers) {
        if (u.username === username) {
          targetSocketId = sid;
          break;
        }
      }
      if (targetSocketId) {
        socket.to(targetSocketId).emit('group:invited', {
          groupId: group.id,
          groupName: group.name,
          by: currentUser.username
        });
      }
    });

    socket.on('group:join', (data) => {
      if (!currentUser) return;
      const { groupId } = data;
      const group = groups.get(groupId);
      if (!group) return;
      if (!group.members.includes(currentUser.username)) {
        group.members.push(currentUser.username);
      }
      group.messages = db.getGroupMessages(groupId);
      io.emit('groups:list', getGroupsForUser(currentUser.username));
      socket.emit('group:joined', group);
    });

    socket.on('group:leave', (data) => {
      if (!currentUser) return;
      const { groupId } = data;
      const group = groups.get(groupId);
      if (!group) return;
      group.members = group.members.filter((m) => m !== currentUser.username);
      io.emit('groups:list', getGroupsForUser(currentUser.username));
      if (group.members.length === 0) {
        groups.delete(groupId);
      }
    });

    socket.on('group:message', (data) => {
      if (!currentUser) return;
      const { groupId, content } = data;
      const group = groups.get(groupId);
      if (!group || !group.members.includes(currentUser.username)) return;

      const sanitized = content.slice(0, 500);
      const msg = {
        from: currentUser.username,
        content: sanitized,
        groupId,
        timestamp: new Date().toISOString()
      };

      const isPersistent = currentUser.role !== 'anonymous';
      if (isPersistent) {
        const saved = db.saveGroupMessage(groupId, currentUser.username, sanitized);
        msg.id = saved.id;
      }

      for (const [sid, u] of onlineUsers) {
        if (u.username !== currentUser.username && group.members.includes(u.username)) {
          socket.to(sid).emit('group:message:new', msg);
        }
      }
      socket.emit('group:message:new', msg);
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      if (currentUser) {
        io.emit('users:update', Array.from(onlineUsers.values()));
      }
    });
  });
}

function getGroupsForUser(username) {
  return Array.from(groups.values()).filter((g) => g.members.includes(username));
}

module.exports = setupSocket;
