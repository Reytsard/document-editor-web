# DocEditor — Architecture

## Overview

DocEditor is a single-server web application. An Express.js server serves both a REST API and a pre-built React single-page application. All data is stored in SQLite. Authentication uses session cookies with bcrypt-hashed passwords.

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Login   │  │ Doc List │  │  TipTap Editor   │  │
│  │          │  │          │  │  ┌─────────────┐  │  │
│  │          │  │ - Owned  │  │  │  Toolbar    │  │  │
│  │          │  │ - Shared │  │  │  B I U H1.. │  │  │
│  │          │  │ - Upload │  │  ├─────────────┤  │  │
│  │          │  │          │  │  │  ProseMirror│  │  │
│  │          │  │          │  │  │  content    │  │  │
│  │          │  │          │  │  └─────────────┘  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                    │ fetch /api/*                   │
└────────────────────┼────────────────────────────────┘
                     │
┌────────────────────┼────────────────────────────────┐
│              Express Server (port 3000)              │
│                                                     │
│  ┌─────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ auth.js     │  │ docs.js  │  │ attachments.js│  │
│  │             │  │          │  │               │  │
│  │ login/logout│  │ CRUD     │  │ upload/list   │  │
│  │ /me         │  │ upload   │  │ download/del  │  │
│  │ /users      │  │ import   │  │               │  │
│  │ middleware  │  │ share    │  │               │  │
│  └──────┬──────┘  └────┬─────┘  └───────┬───────┘  │
│         │              │                │           │
│  ┌──────┴──────────────┴────────────────┴───────┐   │
│  │              sanitize.js                     │   │
│  │  sanitize-html → strips scripts, iframes,   │   │
│  │  event handlers; allows formatting tags     │   │
│  └──────────────────┬──────────────────────────┘   │
│                     │                               │
│  ┌──────────────────┴──────────────────────────┐   │
│  │            database.js (SQLite)              │   │
│  │                                             │   │
│  │  users   │ documents │ document_shares      │   │
│  │          │           │         │ attachments │   │
│  │  id      │ id        │ id      │ id          │   │
│  │  username│ title     │ doc_id ─┤ doc_id      │   │
│  │  name    │ content ──┤ user_id │ filename    │   │
│  │  hash    │ owner_id ─┘ perm    │ orig_name   │   │
│  └──────────┴──────────────────────┴────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │         Static File Serving                  │    │
│  │  client/dist/  → React SPA (production)     │    │
│  │  uploads/      → Attachment files           │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## Layer-by-Layer Design

### 1. Data Layer (`database.js`)

**Choice: SQLite via better-sqlite3**

SQLite was chosen for zero-configuration deployment — no separate database process, no connection strings. The database is a single file (`data/doc-editor.db`) created automatically on first run.

`better-sqlite3` provides a synchronous API, which simplifies the Express route handlers (no async/await for DB calls). WAL journal mode enables concurrent reads without locking.

**Schema relationships**:
- `documents.owner_id` → `users.id` (CASCADE delete)
- `document_shares.document_id` → `documents.id` (CASCADE delete)
- `document_shares.user_id` → `users.id` (CASCADE delete)
- `attachments.document_id` → `documents.id` (CASCADE delete)
- UNIQUE constraint on `(document_id, user_id)` in document_shares prevents duplicate shares

**Seed data** runs only once (checks `SELECT COUNT(*) FROM users`). Creates 3 users, 2 documents owned by Alice, and 1 share granting Bob read access to the Welcome Document.

### 2. Authentication Layer (`routes/auth.js`)

**Choice: Session-based auth with bcryptjs**

Session cookies were chosen over JWT because:
- No token management or refresh logic needed
- Works naturally with `credentials: 'include'` fetch
- Sessions stored in server memory (adequate for a demo)

**Three-tier authorization middleware**:

| Middleware | Checks | Used by |
|---|---|---|
| `requireAuth` | `req.session.userId` exists | All protected routes |
| `requireOwner` | Document's `owner_id === session userId` | Delete, rename, share |
| `requireAccess(perm)` | Owner OR share with sufficient permission | Read, update, attach |

`requireAccess` is a higher-order function: `requireAccess('write')` allows the owner (full access) and shared users with write permission, but rejects read-only shared users.

### 3. Content Pipeline & Security (`sanitize.js`)

Every HTML content path goes through sanitization before storage:

```
TipTap editor ──→ editor.getHTML() ──→ PUT /api/documents/:id ──→ sanitize() ──→ SQLite
.md upload ────→ multer ──→ marked.parse() ──→ sanitize() ──→ SQLite
.txt import ───→ multer ──→ <p> wrapping ──→ sanitize() ──→ SQLite
```

`sanitize-html` uses a whitelist approach:
- **Allowed tags**: h1-h6, p, br, strong, b, em, i, u, s, del, ul, ol, li, table/tr/td/th, pre, code, blockquote, a, img, hr, sup, sub
- **Allowed attributes**: href/name/target on `<a>`, src/alt/title on `<img>`, colspan/rowspan on table cells
- **Stripped**: `<script>`, `<iframe>`, `onclick`/`onerror` handlers, `<style>`, `<object>`, `<embed>`

This is a defense-in-depth measure. Even though TipTap's ProseMirror schema prevents most XSS vectors, the upload and import paths accept arbitrary input that must be sanitized.

### 4. Document Routes (`routes/documents.js`)

**Route-method combinations follow REST conventions**:
- `GET /` — list all documents the user can see (owned + shared)
- `POST /` — create a new blank document
- `GET /:id` — read a single document (with permission field)
- `PUT /:id` — update document content (full replace)
- `PATCH /:id/rename` — partial update of title field only
- `DELETE /:id` — delete document + cascade to shares + attachments

**Special routes for file handling**:
- `POST /upload-md` — multer parses multipart upload, `marked` converts .md to HTML
- `POST /:id/import` — multer parses upload, appends html to existing document content with `<hr>` separator

**Sharing routes follow a sub-resource pattern**:
- `POST /:id/share` — grant access (upsert: creates or updates existing share)
- `DELETE /:id/share/:userId` — revoke access
- `GET /:id/shares` — list current shares with user details

### 5. Attachment Routes (`routes/attachments.js`)

Attachments are stored on disk in `uploads/` with UUID-based filenames. Metadata (original name, MIME type, size, timestamp) is stored in SQLite.

- Upload → multer saves file to `uploads/` → INSERT into attachments table
- List → SELECT from attachments WHERE document_id = ?
- Download → Express static middleware serves `/uploads/:filename`
- Delete → unlink file from disk → DELETE from attachments table

File size limit: 10 MB (configurable in multer options).

### 6. Frontend Architecture (`client/`)

**Component tree**:
```
App
├── Login               (shown when no user)
└── app-layout          (shown when authenticated)
    ├── app-header      (logo + sign out)
    └── app-body
        ├── sidebar
        │   └── DocumentList   (owned + shared sections)
        └── main-content
            ├── DocumentEditor (TipTap + auto-save)
            │   ├── editor-status
            │   ├── Toolbar
            │   └── editor-scroll
            │       └── EditorContent (TipTap)
            └── right-panel
                ├── AttachmentList    (tab 1)
                └── SharingPanel     (tab 2)
```

**Data flow**:
1. `App` holds top-level state: `user`, `docs`, `selectedDocId`
2. `DocumentList` receives `docs` via props, calls `onRefresh` after mutations
3. `DocumentEditor` receives `docId` via props, fetches document independently
4. `SharingPanel` and `AttachmentList` receive `docId` and permission flags, manage their own state internally
5. All API calls go through `api/client.js` which wraps `fetch` with `credentials: 'include'`

**State management**: No global state library. React `useState` + prop drilling is sufficient for this component tree depth. A state library (Redux, Zustand) would be over-engineering for 7 components.

**Auto-save mechanism** (`DocumentEditor.jsx`):
1. TipTap's `onUpdate` fires on every keystroke
2. A `saveTimerRef` debounces saves by 1.5 seconds
3. The save callback reads `docIdRef.current` (always fresh via ref, avoids stale closure bug)
4. `PUT /api/documents/:id` sends the HTML to the server
5. Visual indicators: "Saving..." during request, "Saved" for 2 seconds after success

**Scroll handling**: ProseMirror calls `preventDefault()` on wheel events. A wrapper div (`.editor-scroll`) with `overflow-y: auto` provides the native scrollbar. A JavaScript `wheel` event listener on this div manually sets `scrollTop += deltaY`, bypassing ProseMirror's event suppression.

**CSS layout strategy**: Full-viewport flexbox layout with `min-height: 0` at every nested flex level. This is necessary because flex items default to `min-height: auto`, which prevents them from shrinking below content height — breaking overflow scrolling.

```
.app-layout (height: 100vh, column)
  .app-header (flex-shrink: 0, 52px)
  .app-body (flex: 1, min-height: 0, row)
    .sidebar (280px, min-height: 0)
    .main-content (flex: 1, min-height: 0, row)
      .editor-container (flex: 1, min-height: 0, column)
        .editor-status (auto)
        .toolbar (auto)
        .editor-scroll (flex: 1, min-height: 0, overflow-y: auto) ← scrollbar
          .editor-content (no height constraint, natural content height)
```

---

## Key Architectural Decisions & Tradeoffs

### 1. HTML storage vs. structured document format
**Chose**: Raw HTML in SQLite
**Tradeoff**: Simpler than a structured format (JSON nodes), but no server-side search or structured queries on document content. For a demo with < 100 documents, this is perfectly adequate.

### 2. Synchronous DB API vs. async
**Chose**: `better-sqlite3` (synchronous)
**Tradeoff**: Blocking the event loop during large queries is a concern at scale, but for a demo app with single-digit millisecond queries, the code simplicity outweighs the theoretical risk.

### 3. Session store vs. JWT
**Chose**: In-memory express-session
**Tradeoff**: Sessions don't survive server restart (users must re-login). For a demo, this is fine. Production would use a persistent session store (Redis, SQLite).

### 4. Single server vs. separate API + frontend
**Chose**: Single Express server serving both API and static React build
**Tradeoff**: Simpler deployment (one process, one port) but no horizontal scaling of frontend separately from API. Ideal for a demo. Production would separate into CDN-served frontend + scalable API.

### 5. No ORM vs. an ORM
**Chose**: Raw SQL via `db.prepare().run()/.get()/.all()`
**Tradeoff**: More verbose than an ORM (Prisma, Knex) but zero abstraction overhead, full control over queries, and no additional dependency. For 4 tables and ~20 query patterns, an ORM adds complexity without benefit.

---

## Test Architecture

`tests/api.test.js` uses Jest + supertest to test the Express app without starting a real HTTP server. The test file:

1. Creates a fresh Express app with the same middleware and routes
2. Uses `supertest.agent()` to maintain session cookies across requests
3. Tests each route with both valid and invalid auth scenarios
4. Cleans up the test database after all tests

The test suite is structured into 5 `describe` blocks mirroring the route structure:
- Authentication (3 tests)
- Document CRUD (6 tests)
- Markdown Upload (1 test)
- Sharing (4 tests)
- Attachments (3 tests)

---

## Security Model

| Concern | Mitigation |
|---|---|
| Stored XSS | `sanitize-html` on all content writes (3 injection points) |
| Unauthorized access | Three-tier middleware at route level (auth, owner, access) |
| Session hijacking | `httpOnly` cookie, no JS access to session token |
| File upload abuse | multer size limits (5MB md, 10MB attachments), extension filtering |
| SQL injection | Parameterized queries via `?` placeholders (never string interpolation) |
| Password storage | bcrypt with salt rounds = 10 |
| Path traversal | UUID-based filenames for uploads, no user-supplied paths |
