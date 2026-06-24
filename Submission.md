# Submission — DocEditor

## Deliverables Checklist

- [x] **Source code** — Full application source (see File Manifest below)
- [x] **README.md** — Local setup, run instructions, architecture overview
- [x] **Plan.md** — Requirements checklist with per-feature verification, architecture note, AI tool usage report
- [x] **CHANGES.md** — Detailed log of all bug fixes and changes made during development
- [x] **WALKTHROUGH.txt** — Step-by-step video recording script
- [x] **Live product URL** — See below
- [x] **17 automated tests** — `tests/api.test.js`, run with `npm test`

## Live URL

**http://localhost:3000** after running `npm install && npm run build && npm start`

## File Manifest

### Server (Backend)
| File | Purpose |
|---|---|
| `server.js` | Express entry point, session setup, static file serving |
| `database.js` | SQLite schema (4 tables), seed data (3 users, 2 docs, 1 share), `closeDB()` |
| `sanitize.js` | HTML sanitization via `sanitize-html`, XSS prevention |
| `routes/auth.js` | Login/logout/me routes, auth middleware (requireAuth, requireOwner, requireAccess) |
| `routes/documents.js` | Document CRUD, .md upload, file import, sharing grant/revoke |
| `routes/attachments.js` | Attachment upload (multer), list, delete, file download |
| `tests/api.test.js` | 17 Jest + supertest integration tests |
| `package.json` | Dependencies, npm scripts (dev, build, start, test) |
| `vite.config.js` | Vite config with API proxy for dev mode |

### Client (Frontend)
| File | Purpose |
|---|---|
| `client/index.html` | Entry HTML, SPA mount point |
| `client/src/main.jsx` | React root render |
| `client/src/App.jsx` | App shell: header, sidebar, editor, right panel, auth gate |
| `client/src/App.css` | Complete application styling (~540 lines) |
| `client/src/api/client.js` | Fetch wrapper for all 16 API endpoints |
| `client/src/components/Login.jsx` | Login form with username dropdown + password |
| `client/src/components/DocumentList.jsx` | Sidebar: owned/shared docs, create, rename, delete, upload .md |
| `client/src/components/DocumentEditor.jsx` | TipTap editor integration, auto-save, Ctrl+S, wheel scroll handling |
| `client/src/components/Toolbar.jsx` | Bold, Italic, Underline, H1-H3, Paragraph, Bullet List, Ordered List |
| `client/src/components/SharingPanel.jsx` | Grant/revoke access UI, permission selector |
| `client/src/components/AttachmentList.jsx` | Upload, list, download, delete attachments, import into doc |

### Documentation
| File | Purpose |
|---|---|
| `README.md` | Setup instructions, tech stack, architecture, API reference |
| `Plan.md` | Requirements checklist, architecture decisions, AI tool usage, verification |
| `CHANGES.md` | Detailed change log of all fixes |
| `Submission.md` | This file — deliverables checklist and manifest |
| `WALKTHROUGH.txt` | Video recording script |
| `.gitignore` | Excludes node_modules, dist, data, uploads |

## Key Technical Highlights

- **XSS prevention**: All HTML content sanitized via `sanitize-html` at 3 injection points
- **Authorization**: Three-tier middleware (requireAuth, requireOwner, requireAccess)
- **Auto-save**: 1.5s debounce + Ctrl/S manual save, with visual status indicators
- **Mouse wheel fix**: JavaScript wheel handler bypasses ProseMirror's `preventDefault()`
- **Full-height layout**: `min-height: 0` chain across 5 nested flex containers
- **Test coverage**: Auth, CRUD, sharing, attachments, access control — 17 tests
