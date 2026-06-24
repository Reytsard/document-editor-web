const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DB_DIR || path.join(__dirname, 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'doc-editor.db');

let db;

function initDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();
  seedData();
  return db;
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content TEXT DEFAULT '',
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS document_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission TEXT NOT NULL DEFAULT 'read',
      UNIQUE(document_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function seedData() {
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers.count > 0) return;

  const hash = bcrypt.hashSync('password123', 10);

  const insertUser = db.prepare(
    'INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)'
  );
  insertUser.run('alice', 'Alice Johnson', hash);
  insertUser.run('bob', 'Bob Smith', hash);
  insertUser.run('charlie', 'Charlie Brown', hash);

  const alice = db.prepare('SELECT id FROM users WHERE username = ?').get('alice');
  const bob = db.prepare('SELECT id FROM users WHERE username = ?').get('bob');

  const insertDoc = db.prepare(
    'INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)'
  );

  const welcomeContent = '<h2>Welcome to DocEditor!</h2><p>This is a sample document to get you started.</p><p>You can <strong>bold</strong>, <em>italicize</em>, and <u>underline</u> text.</p><h3>Features</h3><ul><li>Create and edit documents</li><li>Share with other users</li><li>Upload attachments</li><li>Import markdown files</li></ul>';
  
  insertDoc.run('Welcome Document', welcomeContent, alice.id);
  insertDoc.run('Meeting Notes', '<h2>Team Standup</h2><ol><li>Review yesterday progress</li><li>Discuss blockers</li><li>Plan today tasks</li></ol>', alice.id);

  const welcomeDoc = db.prepare('SELECT id FROM documents WHERE title = ?').get('Welcome Document');
  db.prepare('INSERT INTO document_shares (document_id, user_id, permission) VALUES (?, ?, ?)').run(welcomeDoc.id, bob.id, 'read');
}

function closeDB() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { initDB, getDB, closeDB };
