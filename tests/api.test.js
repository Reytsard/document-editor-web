const request = require('supertest');
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

let app;
let server;
let agent;

beforeAll(() => {
  process.env.DB_PATH = path.join(__dirname, '..', 'data', 'test-db.sqlite');
  const { initDB } = require('../database');
  const authRoutes = require('../routes/auth');
  const documentRoutes = require('../routes/documents');
  const attachmentRoutes = require('../routes/attachments');

  app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
  }));
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  initDB();

  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api', attachmentRoutes);

  app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large' });
    }
    res.status(500).json({ error: err.message || 'Server error' });
  });

  agent = request.agent(app);
});

afterAll(() => {
  const { closeDB } = require('../database');
  closeDB();
  const dbPath = path.join(__dirname, '..', 'data', 'test-db.sqlite');
  try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (_) {}
  const walPath = dbPath + '-wal';
  try { if (fs.existsSync(walPath)) fs.unlinkSync(walPath); } catch (_) {}
  const shmPath = dbPath + '-shm';
  try { if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath); } catch (_) {}
});

describe('Authentication', () => {
  test('login with valid credentials', async () => {
    const res = await agent.post('/api/auth/login').send({
      username: 'alice',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
    expect(res.body.display_name).toBe('Alice Johnson');
  });

  test('login with invalid credentials', async () => {
    const res = await agent.post('/api/auth/login').send({
      username: 'alice',
      password: 'wrong',
    });
    expect(res.status).toBe(401);
  });

  test('get current user when authenticated', async () => {
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
  });
});

describe('Document CRUD', () => {
  let docId;

  async function loginAs(username) {
    await agent.post('/api/auth/login').send({
      username,
      password: 'password123',
    });
  }

  beforeAll(async () => {
    await loginAs('alice');
  });

  test('create a new document', async () => {
    const res = await agent.post('/api/documents');
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Untitled');
    docId = res.body.id;
  });

  test('list documents includes created doc', async () => {
    const res = await agent.get('/api/documents');
    expect(res.status).toBe(200);
    expect(res.body.owned.some(d => d.id === docId)).toBe(true);
  });

  test('rename a document', async () => {
    const res = await agent.patch(`/api/documents/${docId}/rename`).send({
      title: 'My New Title',
    });
    expect(res.status).toBe(200);

    const getRes = await agent.get(`/api/documents/${docId}`);
    expect(getRes.body.title).toBe('My New Title');
  });

  test('update document content', async () => {
    const html = '<h1>Hello</h1><p>World</p>';
    const res = await agent.put(`/api/documents/${docId}`).send({
      content: html,
    });
    expect(res.status).toBe(200);

    const getRes = await agent.get(`/api/documents/${docId}`);
    expect(getRes.body.content).toBe(html);
  });

  test('delete a document', async () => {
    const res = await agent.delete(`/api/documents/${docId}`);
    expect(res.status).toBe(200);

    const getRes = await agent.get(`/api/documents/${docId}`);
    expect(getRes.status).toBe(404);
  });

  test('non-owner cannot delete document', async () => {
    const createRes = await agent.post('/api/documents');
    const ownerDocId = createRes.body.id;

    await loginAs('bob');

    const res = await agent.delete(`/api/documents/${ownerDocId}`);
    expect(res.status).toBe(403);

    await loginAs('alice');
    await agent.delete(`/api/documents/${ownerDocId}`);
  });
});

describe('Markdown Upload', () => {
  beforeAll(async () => {
    await agent.post('/api/auth/login').send({
      username: 'alice',
      password: 'password123',
    });
  });

  test('upload .md file creates a document', async () => {
    const testDir = path.join(__dirname, '..', 'data');
    const mdPath = path.join(testDir, 'test-upload.md');
    fs.writeFileSync(mdPath, '# Test MD\n\nThis is a **test**.');

    const res = await agent
      .post('/api/documents/upload-md')
      .attach('file', mdPath);

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('test-upload');
    expect(res.body.content).toContain('<h1>');
    expect(res.body.content).toContain('<strong>test</strong>');

    await agent.delete(`/api/documents/${res.body.id}`);
    fs.unlinkSync(mdPath);
  });
});

describe('Sharing', () => {
  let sharedDocId;

  beforeAll(async () => {
    await agent.post('/api/auth/login').send({
      username: 'alice',
      password: 'password123',
    });
    const res = await agent.post('/api/documents');
    sharedDocId = res.body.id;
  });

  test('share document with another user', async () => {
    const res = await agent.post(`/api/documents/${sharedDocId}/share`).send({
      username: 'bob',
      permission: 'read',
    });
    expect(res.status).toBe(200);
  });

  test('shared user can view document', async () => {
    await agent.post('/api/auth/login').send({
      username: 'bob',
      password: 'password123',
    });
    const res = await agent.get(`/api/documents/${sharedDocId}`);
    expect(res.status).toBe(200);
    expect(res.body.userPermission).toBe('read');
  });

  test('shared user with read-only cannot update', async () => {
    await agent.post('/api/auth/login').send({
      username: 'bob',
      password: 'password123',
    });
    const res = await agent.put(`/api/documents/${sharedDocId}`).send({
      content: '<p>hacked</p>',
    });
    expect(res.status).toBe(403);
  });

  test('revoke access', async () => {
    await agent.post('/api/auth/login').send({
      username: 'alice',
      password: 'password123',
    });

    const bobUserRes = await agent.get('/api/auth/users');
    const bob = bobUserRes.body.find(u => u.username === 'bob');

    const res = await agent.delete(`/api/documents/${sharedDocId}/share/${bob.id}`);
    expect(res.status).toBe(200);

    await agent.post('/api/auth/login').send({
      username: 'bob',
      password: 'password123',
    });
    const getRes = await agent.get(`/api/documents/${sharedDocId}`);
    expect(getRes.status).toBe(403);
  });

  afterAll(async () => {
    await agent.post('/api/auth/login').send({
      username: 'alice',
      password: 'password123',
    });
    await agent.delete(`/api/documents/${sharedDocId}`);
  });
});

describe('Attachments', () => {
  let docId;

  beforeAll(async () => {
    await agent.post('/api/auth/login').send({
      username: 'alice',
      password: 'password123',
    });
    const res = await agent.post('/api/documents');
    docId = res.body.id;
  });

  test('upload attachment', async () => {
    const testDir = path.join(__dirname, '..', 'data');
    const filePath = path.join(testDir, 'test-attachment.txt');
    fs.writeFileSync(filePath, 'attachment content');

    const res = await agent
      .post(`/api/documents/${docId}/attachments`)
      .attach('file', filePath);

    expect(res.status).toBe(201);
    expect(res.body.original_name).toBe('test-attachment.txt');

    fs.unlinkSync(filePath);
  });

  test('list attachments', async () => {
    const res = await agent.get(`/api/documents/${docId}/attachments`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test('delete attachment', async () => {
    const listRes = await agent.get(`/api/documents/${docId}/attachments`);
    const attId = listRes.body[0].id;

    const res = await agent.delete(`/api/documents/${docId}/attachments/${attId}`);
    expect(res.status).toBe(200);

    const afterRes = await agent.get(`/api/documents/${docId}/attachments`);
    expect(afterRes.body.length).toBe(0);
  });

  afterAll(async () => {
    await agent.delete(`/api/documents/${docId}`);
  });
});
