const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const { initDB } = require('./database');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const attachmentRoutes = require('./routes/attachments');

const app = express();
const PORT = process.env.PORT || 3000;

initDB();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(session({
  secret: 'doc-editor-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
}));

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api', attachmentRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.static(path.join(__dirname, 'client', 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

app.use((err, req, res) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`DocEditor server running at http://localhost:${PORT}`);
});
