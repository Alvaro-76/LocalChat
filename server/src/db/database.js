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
  const user = { id: db.nextUserId++, username, password_hash: passwordHash, role, created_at: new Date().toISOString() };
  db.users.push(user);
  writeDB(db);
  return user;
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
  return db.users.map(({ id, username, role, created_at }) => ({ id, username, role, created_at }));
}

module.exports = {
  createUser,
  getUser,
  saveMessage,
  getGlobalMessages,
  getDMs,
  deleteMessage,
  getAllUsers
};
