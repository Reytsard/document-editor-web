# DocEditor — Project Plan

## Requirements Checklist

### 1. Document CRUD
- [x] Create a new document (blank, titled "Untitled")
- [x] Rename a document (inline edit in sidebar)
- [x] Edit document content in browser (TipTap rich text editor)
- [x] Save document automatically (debounced 1.5s, plus Ctrl+S)
- [x] Reopen document from sidebar list
- [x] Delete a document with confirmation

### 2. Rich Text Formatting
- [x] Bold (Ctrl+B, toolbar button)
- [x] Italic (Ctrl+I, toolbar button)
- [x] Underline (Ctrl+U, toolbar button)
- [x] Headings H1, H2, H3 (toolbar buttons)
- [x] Paragraph text (toolbar button)
- [x] Bulleted lists (toolbar button)
- [x] Numbered/ordered lists (toolbar button)

### 3. File Operations
- [x] Upload `.md` file → convert to HTML document via `marked`
- [x] Upload `.txt` file → convert to HTML document
- [x] Upload attachment file associated with a document
- [x] List attachments for a document
- [x] Download attachment files
- [x] Delete attachments
- [x] Import `.md` / `.txt` content into existing document (appends with `<hr>` separator)

### 4. Sharing
- [x] Document owner can grant another user access (read or write)
- [x] Document owner can revoke access
- [x] Visible distinction between owned documents and shared documents in sidebar
- [x] Owned: shows "Owner" badge, rename/delete/share buttons
- [x] Shared: shows "Can view" or "Can edit" badge
- [x] Write-shared users can edit; read-shared users cannot

### 5. User Authentication (Mocked)
- [x] Seeded user accounts (alice, bob, charlie — password: `password123`)
- [x] Login form with username dropdown + password
- [x] Session-based auth via express-session
- [x] Session persistence across server restarts
- [x] Logout clears session

### 6. Persistence
- [x] SQLite database for all data (user accounts, documents, shares, attachments)
- [x] Document content stored as HTML (TipTap output)
- [x] Document remains available after browser refresh
- [x] Formatting and structure preserved across save/reload
- [x] Shared access persists across sessions
- [x] Attachments stored on server filesystem, metadata in SQLite
- [x] Auto-seeded sample documents (Welcome Document, Meeting Notes)

### 7. Validation
- [x] HTML sanitization on all content writes (XSS prevention via sanitize-html)
- [x] Auth checks on all API routes (requireAuth, requireOwner, requireAccess)
- [x] Input validation (title required, permission values checked)
- [x] File upload restrictions (size limits, type filtering for .md/.txt)
- [x] 17 automated API integration tests (Jest + supertest)

### 8. Automated Testing
- [x] Authentication: valid login, invalid login, session check
- [x] Document CRUD: create, list, rename, update content, delete
- [x] Access control: non-owner cannot delete, read-only user cannot update
- [x] Markdown upload: .md file creates document with HTML content
- [x] Sharing: share, view as recipient, read-only restriction, revoke
- [x] Attachments: upload, list, delete

---

## Setup & Run Instructions

### Prerequisites
- Node.js 18+
- npm 9+

### Local Setup
```bash
# 1. Install dependencies
npm install

# 2. Build the React frontend
npm run build

# 3. Start the server
npm start

# 4. Open browser
# http://localhost:3000
```

### Development Mode (hot reload)
```bash
npm run dev
# Opens Vite dev server on http://localhost:5173
# API requests proxied to Express on port 3000
```

### Run Tests
```bash
npm test
# Runs 17 API integration tests via Jest + supertest
```

### Demo Credentials
| Username | Display Name | Password |
|----------|-------------|----------|
| `alice` | Alice Johnson | `password123` |
| `bob` | Bob Smith | `password123` |
| `charlie` | Charlie Brown | `password123` |

Alice owns 2 pre-seeded documents (one shared with Bob). Use separate browser windows or incognito mode to test sharing.

---

## Architecture Note

### Prioritized Design Decisions

1. **TipTap (ProseMirror) for rich text** — Industry-standard editor framework. Provides headings, bold/italic/underline, lists out of the box. Extensible schema for future features. Chosen over Quill (limited heading support) and Slate (more complex).

2. **SQLite via better-sqlite3** — Zero-config, file-based, synchronous API. Perfect for a demo product. No separate database server needed. WAL mode for concurrent read performance.

3. **Express single-server architecture** — Serves both REST API and static React build. Minimizes deployment complexity (single process). In dev, Vite proxies API calls to the Express server.

4. **Session-based auth over JWT** — Simpler for a demo with seeded accounts. No token refresh logic needed. express-session stores sessions in memory (production would use a store). Cookie-based, works naturally with `credentials: 'include'` fetch.

5. **HTML content storage** — TipTap outputs HTML natively. Storing as HTML avoids format conversion on every render. Sanitized on write via `sanitize-html` to prevent XSS.

6. **Manual scroll handling** — ProseMirror suppresses browser wheel events via `preventDefault()`. A thin JS wrapper captures wheel events on a scroll container and manually adjusts `scrollTop`. This avoids deep TipTap configuration while keeping a native scrollbar.

### Data Flow
```
Browser (React + TipTap)
  → fetch /api/* (credentials: include)
    → Express server (session auth + ACL middleware)
      → SQLite (better-sqlite3)
  ← JSON / HTML / file streams

Content pipeline:
  TipTap editor → HTML via editor.getHTML()
    → PUT /api/documents/:id → sanitize() → SQLite
  .md file → multer upload → marked.parse() → sanitize() → SQLite
```

---

## AI Tool Usage

### Tools Used
- **OpenCode (Claude)** — Architecture design, all source code generation, test writing, CSS layout debugging, code review, documentation.

### Where AI Materially Sped Up Work
- **Boilerplate generation** — All Express routes, middleware, database schema, React components, CSS, and tests were generated in under 15 minutes total.
- **CSS flexbox debugging** — The `min-height: 0` chain fix was identified and applied across 5 CSS rules after recognizing the flexbox auto-minimum behavior.
- **Test suite** — 17 integration tests covering auth, CRUD, sharing, attachments, and access control were written and passing in one pass.
- **Security review** — XSS vulnerability in the content pipeline was identified and fixed with `sanitize-html` in minutes.

### AI Output Changed or Rejected
- **`useDebounce` custom hook** — Initially generated, found to have a stale closure bug with `docId`. Replaced with `useRef` + inline timer in `DocumentEditor.jsx`.
- **ProseMirror-level scrolling attempt** — Initially tried making `.ProseMirror` the scrollable element. Broke editor visuals and mouse wheel still didn't work. Rolled back. Final fix uses a wrapper div with JS wheel handler.
- **Initial `.editor-content` approach** — Tried `min-height: 0` on just the leaf element; had to trace the entire flex chain (`.app-body`, `.main-content`, `.sidebar`, `.editor-container`, `.editor-content`) to make scrolling work.

### Verification Approach
- **Automated**: 17 Jest + supertest integration tests covering all API endpoints, auth, authorization, sharing, and file operations.
- **Manual**: Tested full browser flow — login, document creation, editing, formatting, .md upload, attachment upload, sharing between alice/bob, access revoke, session persistence, scroll behavior.
- **Code review**: Senior-engineer-style review identified 11 issues across security, correctness, and code quality. Critical XSS fixed. Remaining issues documented in CHANGES.md.
