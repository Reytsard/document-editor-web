const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { marked } = require('marked');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { sanitize } = require('../sanitize');
const { requireAuth, requireOwner, requireAccess } = require('./auth');

const router = express.Router();

const mdStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});

const mdUpload = multer({
  storage: mdStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.md' || ext === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('Only .md and .txt files are allowed for import'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get('/', requireAuth, (req, res) => {
  const db = getDB();

  const owned = db.prepare(`
    SELECT d.*, u.display_name as owner_name, 'owner' as role
    FROM documents d JOIN users u ON d.owner_id = u.id
    WHERE d.owner_id = ?
    ORDER BY d.updated_at DESC
  `).all(req.session.userId);

  const shared = db.prepare(`
    SELECT d.*, u.display_name as owner_name, ds.permission as role
    FROM documents d
    JOIN users u ON d.owner_id = u.id
    JOIN document_shares ds ON ds.document_id = d.id
    WHERE ds.user_id = ?
    ORDER BY d.updated_at DESC
  `).all(req.session.userId);

  res.json({ owned, shared });
});

router.post('/', requireAuth, (req, res) => {
  const db = getDB();
  const result = db.prepare(
    'INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)'
  ).run('Untitled', '', req.session.userId);

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(doc);
});

router.get('/:id', requireAuth, requireAccess('read'), (req, res) => {
  const db = getDB();
  const doc = db.prepare(`
    SELECT d.*, u.display_name as owner_name
    FROM documents d JOIN users u ON d.owner_id = u.id
    WHERE d.id = ?
  `).get(req.params.id);

  if (!doc) return res.status(404).json({ error: 'Document not found' });
  doc.userPermission = req.userPermission;
  res.json(doc);
});

router.put('/:id', requireAuth, requireAccess('write'), (req, res) => {
  const { content } = req.body;
  const db = getDB();
  const safeContent = sanitize(content || '');
  db.prepare('UPDATE documents SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(safeContent, req.params.id);
  res.json({ ok: true });
});

router.patch('/:id/rename', requireAuth, requireOwner, (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const db = getDB();
  db.prepare('UPDATE documents SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(title.trim(), req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, requireOwner, (req, res) => {
  const db = getDB();

  const attachments = db.prepare('SELECT filename FROM attachments WHERE document_id = ?').all(req.params.id);
  for (const att of attachments) {
    const filePath = path.join(__dirname, '..', 'uploads', att.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/upload-md', requireAuth, mdUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const mdContent = fs.readFileSync(req.file.path, 'utf-8');
  const rawHtml = marked.parse(mdContent);
  const htmlContent = sanitize(rawHtml);
  const title = path.basename(req.file.originalname, path.extname(req.file.originalname));

  const db = getDB();
  const result = db.prepare(
    'INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)'
  ).run(title, htmlContent, req.session.userId);

  fs.unlinkSync(req.file.path);

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(doc);
});

router.post('/:id/import', requireAuth, requireAccess('write'), mdUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileContent = fs.readFileSync(req.file.path, 'utf-8');
  const ext = path.extname(req.file.originalname).toLowerCase();

  let importedHtml;
  if (ext === '.md') {
    importedHtml = sanitize(marked.parse(fileContent));
  } else {
    importedHtml = sanitize('<p>' + fileContent.replace(/\n/g, '<br>') + '</p>');
  }

  const db = getDB();
  const doc = db.prepare('SELECT content FROM documents WHERE id = ?').get(req.params.id);
  const newContent = doc.content + '<hr>' + importedHtml;

  db.prepare('UPDATE documents SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(newContent, req.params.id);

  fs.unlinkSync(req.file.path);

  res.json({ ok: true });
});

router.post('/:id/share', requireAuth, requireOwner, (req, res) => {
  const { username, permission } = req.body;
  if (!username || !permission) {
    return res.status(400).json({ error: 'Username and permission required' });
  }
  if (!['read', 'write'].includes(permission)) {
    return res.status(400).json({ error: 'Permission must be read or write' });
  }

  const db = getDB();
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.id === req.session.userId) {
    return res.status(400).json({ error: 'Cannot share with yourself' });
  }

  const existing = db.prepare(
    'SELECT id FROM document_shares WHERE document_id = ? AND user_id = ?'
  ).get(req.params.id, user.id);

  if (existing) {
    db.prepare('UPDATE document_shares SET permission = ? WHERE id = ?').run(permission, existing.id);
  } else {
    db.prepare('INSERT INTO document_shares (document_id, user_id, permission) VALUES (?, ?, ?)')
      .run(req.params.id, user.id, permission);
  }

  res.json({ ok: true });
});

router.delete('/:id/share/:userId', requireAuth, requireOwner, (req, res) => {
  getDB().prepare('DELETE FROM document_shares WHERE document_id = ? AND user_id = ?')
    .run(req.params.id, req.params.userId);
  res.json({ ok: true });
});

router.get('/:id/shares', requireAuth, requireOwner, (req, res) => {
  const shares = getDB().prepare(`
    SELECT ds.id, ds.permission, u.id as user_id, u.username, u.display_name
    FROM document_shares ds
    JOIN users u ON ds.user_id = u.id
    WHERE ds.document_id = ?
  `).all(req.params.id);
  res.json(shares);
});

module.exports = router;
