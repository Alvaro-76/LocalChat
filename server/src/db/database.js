const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'db.json');

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { users: [], messages: [], nextUserId: 1, nextMessageId: 1 };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function createUser(username, passwordHash, role = 'user') {
  const db = readDB();
  const color = stringToColor(username);
  const user = { id: db.nextUserId++, username, password_hash: passwordHash, role, avatar: { type: 'color', color }, created_at: new Date().toISOString() };
  db.users.push(user);
  writeDB(db);
  return user;
}

function updateUserAvatar(username, avatarData) {
  const db = readDB();
  const user = db.users.find((u) => u.username === username);
  if (user) {
    user.avatar = avatarData;
    writeDB(db);
  }
}

function updateUserAvatarColor(username, color) {
  const db = readDB();
  const user = db.users.find((u) => u.username === username);
  if (user) {
    user.avatar = { type: 'color', color };
    writeDB(db);
  }
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#e94560', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#ff6b6b', '#48dbfb', '#ff9ff3'];
  return colors[Math.abs(hash) % colors.length];
}

function getUser(username) {
  const db = readDB();
  return db.users.find((u) => u.username === username) || null;
}

function saveMessage(from, to, content, persistent = 1) {
  const db = readDB();
  const msg = {
    id: db.nextMessageId++,
    from_user: from,
    to_user: to || null,
    content,
    persistent,
    created_at: new Date().toISOString()
  };
  db.messages.push(msg);
  writeDB(db);
  return msg;
}

function getGlobalMessages() {
  const db = readDB();
  return db.messages.filter((m) => m.persistent && !m.to_user);
}

function getDMs(user1, user2) {
  const db = readDB();
  return db.messages.filter(
    (m) => m.persistent && m.to_user &&
      ((m.from_user === user1 && m.to_user === user2) || (m.from_user === user2 && m.to_user === user1))
  );
}

function deleteMessage(id) {
  const db = readDB();
  db.messages = db.messages.filter((m) => m.id !== id);
  writeDB(db);
}

function getAllUsers() {
  const db = readDB();
  return db.users.map(({ id, username, role, created_at, avatar }) => ({ id, username, role, created_at, avatar: avatar || { type: 'color', color: stringToColor(username) } }));
}

function saveGroupMessage(groupId, from, content) {
  const db = readDB();
  const msg = {
    id: db.nextMessageId++,
    groupId,
    from_user: from,
    content,
    persistent: 1,
    created_at: new Date().toISOString()
  };
  db.messages.push(msg);
  writeDB(db);
  return msg;
}

function getGroupMessages(groupId) {
  const db = readDB();
  return db.messages.filter((m) => m.groupId === groupId && m.persistent);
}

module.exports = {
  createUser,
  getUser,
  saveMessage,
  getGlobalMessages,
  getDMs,
  deleteMessage,
  getAllUsers,
  updateUserAvatar,
  updateUserAvatarColor,
  stringToColor,
  saveGroupMessage,
  getGroupMessages
};
