# Changes

## 2024-06-24 — Initial bugfixes

### Fixed: Stale `docId` in debounced save
- **File**: `client/src/components/DocumentEditor.jsx`
- **Problem**: The custom `useDebounce` hook captured `docId` from the first render. Switching documents then typing saved content to the previously selected document.
- **Fix**: Replaced `useDebounce` with `useRef` for both `docIdRef` (always current) and `saveTimerRef`. The `onUpdate` callback now reads `docIdRef.current` at save time, always targeting the correct document.

### Fixed: Double content-loading useEffect
- **File**: `client/src/components/DocumentEditor.jsx`
- **Problem**: Two separate `useEffect` blocks both called `editor.commands.setContent()`, causing content flickering and cursor position jumps when loading documents.
- **Fix**: Removed the redundant second `useEffect`. Only the `[docId, editor]` dependency effect loads content now.

### Fixed: File name collision on .md upload
- **File**: `routes/documents.js`
- **Problem**: Temp filenames used `Date.now() + '-' + originalname`, which could collide if two uploads occurred in the same millisecond.
- **Fix**: Switched to `uuid` (`uuidv4() + ext`) for guaranteed unique temp filenames.

### Fixed: Tests clobber development database
- **Files**: `database.js`, `tests/api.test.js`
- **Problem**: Test suite used the same SQLite database path as the development server, overwriting manually created data.
- **Fix**: Added `DB_PATH` / `DB_DIR` environment variable support to `database.js`. Test cleanup uses `closeDB()` before unlinking. Cleanup errors are now caught silently (fixes Windows EBUSY).

### Changed: Editor takes full available height
- **File**: `client/src/App.css`
- **Problem**: Editor had 16px margins and rounded corners, wasting vertical space.
- **Fix**: Removed margins, border-radius, and box-shadow from `.editor-container`. Increased padding to `32px 48px` for a full-page document feel.

### Fixed: App layout not filling full browser height
- **File**: `client/src/App.css`
- **Problem**: `.app-layout` div had no height constraint, so flex children couldn't fill the viewport. Visible gap at bottom of the page.
- **Fix**: Added `.app-layout { height: 100vh; display: flex; flex-direction: column }`.

### Fixed: Document not scrollable (flex `min-height: auto` chain)
- **File**: `client/src/App.css`
- **Problem**: Flex children default to `min-height: auto`, which prevents them from shrinking below their content's intrinsic height. The entire flex chain (`.app-body` → `.main-content` → `.editor-container` → `.editor-content`) refused to constrain, so `overflow-y: auto` never engaged and long documents were clipped.
- **Fix**: Added `min-height: 0` to every flex child in the layout chain: `.app-body`, `.main-content`, `.sidebar`, `.editor-container`, `.editor-content`. This forces each level to respect its allocated height, allowing the scroll container to do its job.

### Fixed: Mouse wheel not scrolling the editor
- **Files**: `client/src/components/DocumentEditor.jsx`, `client/src/App.css`
- **Problem**: ProseMirror/TipTap calls `preventDefault()` on `wheel` events internally. The browser's native scroll action never fires on the parent `overflow-y: auto` container, so the mouse wheel did nothing. Only arrow-key caret movement triggered scrolling.
- **Fix**: Wrapped `EditorContent` in a new `.editor-scroll` div and added a JavaScript `wheel` event listener that manually sets `scrollTop += deltaY`. This bypasses ProseMirror's event suppression entirely. The native scrollbar on `.editor-scroll` remains visible and fully functional.

### Changed: Bottom padding for document readability
- **File**: `client/src/App.css`
- **Problem**: Hard to visually distinguish the end of a document — last line sat right at the bottom edge.
- **Fix**: Added `padding-bottom: 40vh` to the editor scroll area so the last line always has generous whitespace below it.

## 2024-06-24 — Security hardening

### Fixed: Stored XSS via unsanitized HTML
- **Files**: `routes/documents.js`, `sanitize.js` (new)
- **Severity**: High
- **Problem**: Document content from TipTap, `.md` file uploads, and file imports was stored directly in SQLite without any sanitization. A malicious `.md` file containing `<script>alert(1)</script>` would execute in the browser when the document was rendered. Same for content injected via the write API.
- **Fix**: Added `sanitize-html` package and created `sanitize.js` utility. Applied sanitization at all three HTML entry points:
  - `PUT /api/documents/:id` — content update
  - `POST /api/documents/upload-md` — `.md` → HTML conversion
  - `POST /api/documents/:id/import` — file import into existing draft
- Allowed tags include standard formatting elements (h1-h6, p, br, strong, em, u, ul/ol/li, table, pre, code, a, img). Scripts, event handlers, iframes, and other dangerous elements are stripped.
