const crypto = require('crypto');
const db = require('../db/database');
const { verifyToken } = require('../middleware/auth');

const onlineUsers = new Map();
const SERVER_URL = process.env.SERVER_URL || '';

const groups = new Map();
let nextGroupId = 1;

function safeStr(v, maxLen) {
  if (typeof v !== 'string') return '';
  return v.slice(0, maxLen || 500);
}

function hashPassword(pw) {
  if (!pw) return null;
  return crypto.createHash('sha256').update(pw).digest('hex');
}

function setupSocket(io) {
  io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('user:join', (data) => {
      const { username, token } = data;
      const safeName = safeStr(username, 30);
      let user = { username: safeName, role: 'anonymous', id: null };

      if (token) {
        try {
          const decoded = verifyToken(token);
          user = decoded;
          socket.data.user = user;
        } catch {
          socket.emit('error', { message: 'Token inválido, modo invitado' });
          socket.data.user = user;
        }
      } else {
        socket.data.user = user;
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
      if (!data || typeof data.content !== 'string') return;

      const msg = {
        from: currentUser.username,
        content: safeStr(data.content, 500),
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
      if (!data || typeof data.content !== 'string' || typeof data.to !== 'string') return;

      const { to, content } = data;
      const sanitized = safeStr(content, 500);
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
      if (!data || typeof data.fileId !== 'string' || typeof data.fileName !== 'string') return;
      const msg = {
        type: 'file',
        fileId: safeStr(data.fileId, 32),
        fileName: safeStr(data.fileName, 200).replace(/[<>"']/g, ''),
        fileSize: typeof data.fileSize === 'number' ? Math.min(data.fileSize, 50*1024*1024) : 0,
        mimeType: safeStr(data.mimeType, 100),
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
      if (!data || typeof data.fileId !== 'string' || typeof data.fileName !== 'string') return;
      const msg = {
        type: 'file',
        fileId: safeStr(data.fileId, 32),
        fileName: safeStr(data.fileName, 200).replace(/[<>"']/g, ''),
        fileSize: typeof data.fileSize === 'number' ? Math.min(data.fileSize, 50*1024*1024) : 0,
        mimeType: safeStr(data.mimeType, 100),
        from: currentUser.username,
        to: safeStr(data.to, 30),
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

      const registeredUsers = db.getAllUsers().map(u => ({ ...u, isRegistered: true }));

      const anonymousUsers = Array.from(onlineUsers.values())
        .filter(u => u.role === 'anonymous')
        .map(u => ({
          id: u.id,
          username: u.username,
          role: 'anonymous',
          avatar: u.avatar,
          created_at: null,
          isRegistered: false
        }));

      const seen = new Set(registeredUsers.map(u => u.username));
      const allUsers = [...registeredUsers];
      for (const anon of anonymousUsers) {
        if (!seen.has(anon.username)) {
          seen.add(anon.username);
          allUsers.push(anon);
        }
      }

      socket.emit('admin:users:list', allUsers);
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
      if (!data || typeof data.name !== 'string') return;
      const name = data.name.trim().slice(0, 50);
      if (!name) return;
      const id = nextGroupId++;
      const group = {
        id,
        name,
        admin: currentUser.username,
        password: hashPassword(data.password),
        members: [currentUser.username],
        messages: []
      };
      groups.set(id, group);
      io.emit('groups:list', getGroupsForUser(currentUser.username));
      const groupData = { ...group };
      delete groupData.password;
      groupData.hasPassword = !!group.password;
      socket.emit('group:created', groupData);
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
      const { groupId, password } = data;
      if (typeof groupId !== 'number') return;
      const group = groups.get(groupId);
      if (!group) return;
      if (!group.members.includes(currentUser.username)) {
        if (group.password && hashPassword(password) !== group.password) {
          return socket.emit('group:error', { message: 'Contraseña incorrecta' });
        }
        group.members.push(currentUser.username);
      }
      group.messages = db.getGroupMessages(groupId);
      io.emit('groups:list', getGroupsForUser(currentUser.username));
      const groupData = { ...group };
      delete groupData.password;
      groupData.hasPassword = !!group.password;
      socket.emit('group:joined', groupData);
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

    socket.on('clipboard:share', (data) => {
      if (!currentUser) return;
      const { content, to } = data;
      if (!content) return;
      if (to) {
        let targetSocketId = null;
        for (const [sid, u] of onlineUsers) {
          if (u.username === to) {
            targetSocketId = sid;
            break;
          }
        }
        if (targetSocketId) {
          socket.to(targetSocketId).emit('clipboard:shared', {
            from: currentUser.username,
            content: content.slice(0, 10000),
            timestamp: new Date().toISOString()
          });
        }
      } else {
        socket.broadcast.emit('clipboard:shared', {
          from: currentUser.username,
          content: content.slice(0, 10000),
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('group:message', (data) => {
      if (!currentUser) return;
      if (!data || typeof data.content !== 'string') return;
      const { groupId, content } = data;
      const group = groups.get(groupId);
      if (!group) return;
      if (!group.members.includes(currentUser.username)) return;
      const msg = {
        from: currentUser.username,
        content: safeStr(content, 500),
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
  return Array.from(groups.values())
    .filter((g) => g.members.includes(username))
    .map((g) => {
      const data = { ...g };
      delete data.password;
      data.hasPassword = !!g.password;
      return data;
    });
}

module.exports = setupSocket;
