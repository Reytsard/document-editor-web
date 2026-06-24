# DocEditor

A lightweight, browser-based document editor inspired by Google Docs. Built for demonstration with React, TipTap, Express, and SQLite.

## Features

- **Rich text editing** — Bold, italic, underline, headings (H1/H2/H3), bulleted & numbered lists
- **Document management** — Create, rename, edit, save (auto-save + Ctrl+S), reopen, delete
- **Markdown import** — Upload `.md` files to create new documents or append to existing ones
- **File attachments** — Upload files associated with any document, download, delete
- **Sharing** — Grant read or write access to other users, revoke at any time
- **Owned vs. shared distinction** — Clear visual badges in the document sidebar
- **3 seeded users** — alice, bob, charlie (password: `password123`)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Rich text | TipTap (ProseMirror) |
| Backend | Express.js |
| Database | SQLite (better-sqlite3) |
| Auth | express-session + bcryptjs |
| MD → HTML | marked |
| Sanitization | sanitize-html |
| File uploads | multer |
| Tests | Jest + supertest |

## Quick Start

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Start server
npm start
```

Open **http://localhost:3000**

### Development (hot reload)
```bash
npm run dev
# Vite dev server on http://localhost:5173
# API proxied to Express on port 3000
```

### Run Tests
```bash
npm test
```

## Demo Credentials

| Username | Display Name | Password |
|----------|-------------|----------|
| `alice` | Alice Johnson | `password123` |
| `bob` | Bob Smith | `password123` |
| `charlie` | Charlie Brown | `password123` |

Alice has 2 pre-seeded documents (one shared with Bob). Use separate browser windows to test sharing.

## Architecture

Single Express server serving both REST API and static React frontend. SQLite stores users, documents, sharing rules, and attachment metadata. Session cookies handle authentication.

```
Browser (React + TipTap)
  ↕ fetch /api/*
Express server
  ↕ SQLite (better-sqlite3)
  ↕ uploads/ (attachments)
```

### Content Pipeline
```
TipTap editor → HTML → PUT /api/documents/:id → sanitize() → SQLite
.md upload    → multer → marked.parse() → sanitize() → SQLite
```

### Project Structure
```
├── server.js                  # Express entry point
├── database.js                # SQLite schema, seed data
├── sanitize.js                # HTML sanitization (XSS prevention)
├── auth.js                    # Session auth middleware + login routes
├── routes/
│   ├── documents.js           # Document CRUD, upload, import, sharing
│   └── attachments.js         # Attachment upload, list, delete
├── client/
│   ├── index.html
│   └── src/
│       ├── App.jsx            # Main app layout
│       ├── App.css            # All styling
│       ├── api/client.js      # API fetch wrapper
│       └── components/
│           ├── Login.jsx
│           ├── DocumentList.jsx
│           ├── DocumentEditor.jsx  # TipTap integration
│           ├── Toolbar.jsx         # Formatting toolbar
│           ├── SharingPanel.jsx    # Share grant/revoke UI
│           └── AttachmentList.jsx  # File upload/management
└── tests/
    └── api.test.js            # 17 API integration tests
```

### API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/logout` | Yes | Logout |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/auth/users` | Yes | User list (for sharing) |
| GET | `/api/documents` | Yes | List owned + shared docs |
| POST | `/api/documents` | Yes | Create new doc |
| GET | `/api/documents/:id` | Owner/Shared | Get doc |
| PUT | `/api/documents/:id` | Owner/Write | Update content |
| PATCH | `/api/documents/:id/rename` | Owner | Rename doc |
| DELETE | `/api/documents/:id` | Owner | Delete doc |
| POST | `/api/documents/upload-md` | Yes | Upload .md → new doc |
| POST | `/api/documents/:id/import` | Owner/Write | Import file into existing |
| POST | `/api/documents/:id/share` | Owner | Grant access |
| DELETE | `/api/documents/:id/share/:uid` | Owner | Revoke access |
| GET | `/api/documents/:id/shares` | Owner | List shares |
| POST | `/api/documents/:id/attachments` | Owner/Write | Upload attachment |
| GET | `/api/documents/:id/attachments` | Owner/Shared | List attachments |
| DELETE | `/api/documents/:id/attachments/:aid` | Owner/Write | Delete attachment |

## Additional Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Detailed architecture diagrams, design decisions, security model, data flow
- **[AIWORKFLOW.md](AIWORKFLOW.md)** — AI-assisted development workflow, changes made, verification approach
- **[Plan.md](Plan.md)** — Requirements checklist and AI tool usage report

## Deployment

### Glitch (Free)

1. Go to [glitch.com](https://glitch.com) and sign in
2. Click **New Project** → **Import from GitHub** (or drag-drop the project folder)
3. Glitch runs `npm install` then `npm start` automatically
4. Your app is live at `https://your-project.glitch.me`

The `client/dist/` folder is pre-built — Glitch only needs runtime dependencies. No build step on deploy.

**Note**: Glitch free tier sleeps after 5 min inactivity. Wakes on next request (few seconds delay on first load).
