const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { requireAuth, requireAccess } = require('./auth');

const router = express.Router();

const attachmentStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});

const upload = multer({
  storage: attachmentStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/documents/:id/attachments', requireAuth, requireAccess('write'), upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const db = getDB();
  const result = db.prepare(
    'INSERT INTO attachments (document_id, filename, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?)'
  ).run(req.params.id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size);

  const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(att);
});

router.get('/documents/:id/attachments', requireAuth, requireAccess('read'), (req, res) => {
  const attachments = getDB().prepare(
    'SELECT * FROM attachments WHERE document_id = ? ORDER BY uploaded_at DESC'
  ).all(req.params.id);
  res.json(attachments);
});

router.delete('/documents/:id/attachments/:attId', requireAuth, requireAccess('write'), (req, res) => {
  const db = getDB();
  const att = db.prepare('SELECT * FROM attachments WHERE id = ? AND document_id = ?')
    .get(req.params.attId, req.params.id);

  if (!att) return res.status(404).json({ error: 'Attachment not found' });

  const filePath = path.join(__dirname, '..', 'uploads', att.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM attachments WHERE id = ?').run(req.params.attId);
  res.json({ ok: true });
});

module.exports = router;
