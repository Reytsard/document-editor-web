const express = require('express');
const bcrypt = require('bcryptjs');
const { getDB } = require('../database');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

function requireOwner(req, res, next) {
  const doc = getDB().prepare('SELECT owner_id FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.owner_id !== req.session.userId) {
    return res.status(403).json({ error: 'Only the owner can perform this action' });
  }
  req.docOwnerId = doc.owner_id;
  next();
}

function requireAccess(permission) {
  return (req, res, next) => {
    const doc = getDB().prepare('SELECT owner_id FROM documents WHERE id = ?').get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (doc.owner_id === req.session.userId) {
      req.userPermission = 'owner';
      return next();
    }

    const share = getDB().prepare(
      'SELECT permission FROM document_shares WHERE document_id = ? AND user_id = ?'
    ).get(req.params.id, req.session.userId);

    if (!share) {
      return res.status(403).json({ error: 'You do not have access to this document' });
    }

    if (permission === 'write' && share.permission === 'read') {
      return res.status(403).json({ error: 'You have read-only access' });
    }

    req.userPermission = share.permission;
    next();
  };
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = getDB().prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.userId = user.id;
  res.json({ id: user.id, username: user.username, display_name: user.display_name });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const user = getDB().prepare('SELECT id, username, display_name FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json(user);
});

router.get('/users', requireAuth, (req, res) => {
  const users = getDB().prepare('SELECT id, username, display_name FROM users WHERE id != ?').all(req.session.userId);
  res.json(users);
});

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireOwner = requireOwner;
module.exports.requireAccess = requireAccess;
