const db = require('../db/database');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

const onlineUsers = new Map();
const SERVER_URL = process.env.SERVER_URL || '';

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

      currentUser = user;
      onlineUsers.set(socket.id, user);
      io.emit('users:update', Array.from(onlineUsers.values()));
      socket.emit('messages:global', db.getGlobalMessages());
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

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      if (currentUser) {
        io.emit('users:update', Array.from(onlineUsers.values()));
      }
    });
  });
}

module.exports = setupSocket;
