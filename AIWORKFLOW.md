# DocEditor — AI Workflow

## AI Tool Used

**OpenCode (Claude)** — All development was done with AI assistance through OpenCode.

## Development Phases

### Phase 1: Architecture & Scaffolding (AI-generated)
**Duration**: ~15 minutes
**AI role**: Read the requirements, proposed a full architecture (tech stack, database schema, API routes, component tree), generated all boilerplate after human approval.

**Key AI-generated artifacts**:
- `package.json` with dependency versions
- `database.js` — schema + seed data
- `server.js` — Express app setup
- All 3 route files (`auth.js`, `documents.js`, `attachments.js`)
- All 7 React components (Login, DocumentList, DocumentEditor, Toolbar, SharingPanel, AttachmentList, App)
- Full CSS (~540 lines)
- API client wrapper
- 17 integration tests

**Human input**: Approved the tech stack (React + Vite, TipTap, Express, SQLite), chose Glitch for deployment, requested vanilla-css styling over a library.

### Phase 2: Critical Bug Fixes (AI-assisted debugging)
**Duration**: ~30 minutes

| Bug | AI role | Human role |
|---|---|---|
| Stale `docId` in debounced save | Identified the stale closure issue; proposed `useRef` fix | Confirmed the bug |
| Double content-loading useEffect | Spotted redundant useEffect; removed it | Approved |
| File collision on .md upload | Switched `Date.now()` to `uuid` | Approved |
| Tests clobber dev DB | Added `DB_PATH` env var + `closeDB()` | Approved |
| XSS via unsanitized HTML | Identified vulnerability; installed `sanitize-html`; created `sanitize.js`; applied at 3 injection points | Approved |

### Phase 3: CSS Layout Debugging (Iterative AI + human testing)
**Duration**: ~45 minutes (most time-intensive phase)

This phase involved multiple rounds of human testing → bug report → AI fix → rebuild:

| Round | User report | AI analysis | AI fix |
|---|---|---|---|
| 1 | Gap at bottom of page | Missing height on root layout div | Added `.app-layout { height: 100vh }` |
| 2 | Document not scrollable | Flex children default to `min-height: auto` | Added `min-height: 0` to `.editor-content` + `.editor-container` |
| 3 | Still not scrolling | The `min-height: auto` chain goes all the way up | Added `min-height: 0` to `.app-body`, `.main-content`, `.sidebar` |
| 4 | Editor doesn't scroll with mouse wheel | ProseMirror `preventDefault()` on wheel events | First tried CSS on `.ProseMirror` — rolled back (broke visuals). Then tried JavaScript wheel handler on wrapper div — worked |
| 5 | Can't see document end | No visual padding at bottom | Added `padding-bottom: 40vh` to `.editor-scroll` |

**Key lesson**: CSS flexbox `min-height: auto` behavior is a common footgun. The fix requires `min-height: 0` on EVERY flex child in the nesting chain, not just the leaf node.

### Phase 4: Code Review & Security Hardening (AI-driven)
**Duration**: ~15 minutes

AI performed a senior-engineer code review, identifying 11 issues across:
- Security (XSS, session fixation, hardcoded secrets, CORS)
- Correctness (double fetch, race conditions, non-atomic deletes)
- Code quality (missing deps in useEffect, user list exposure)

The XSS fix was prioritized and implemented. Remaining issues were documented but deferred as demo-acceptable.

### Phase 5: Documentation Generation (AI-generated)
**Duration**: ~10 minutes

AI generated all 5 documentation files:
- `Plan.md` — requirements checklist, architecture decisions, AI tool usage
- `README.md` — setup, run, tech stack, API reference
- `Submission.md` — deliverables checklist, file manifest
- `CHANGES.md` — detailed change log
- `WALKTHROUGH.txt` — video recording script

---

## AI Output Changed or Rejected

1. **`useDebounce` custom hook** — AI initially generated a `useDebounce` hook with `useCallback`. The closure captured `docId` from first render. Replaced with `useRef` + inline timer approach.

2. **ProseMirror CSS scroll attempt** — AI tried making `.ProseMirror` the scrollable element with `height: 100%; overflow-y: auto`. This broke the editor visuals (no content visible) and the wheel still didn't work. Rolled back. Final fix: wrapper div + JavaScript wheel handler.

3. **Redundant second useEffect** — AI generated two separate content-loading useEffects in DocumentEditor. The second one was unnecessary and caused content flickering. Removed.

4. **Initial min-height: 0 placement** — AI first added `min-height: 0` only to `.editor-content`. Required 3 more rounds to propagate it through the full flex chain.

---

## Verification Method

### Automated
- **17 Jest + supertest integration tests** covering all API endpoints
- Tests run on every change: `npm test`
- Covers: auth (valid/invalid), CRUD (create/read/update/rename/delete), access control (403 for non-owner), markdown upload, sharing (grant/view/restrict/revoke), attachments (upload/list/delete)

### Manual
Each feature was manually tested in the browser after implementation:
- Login as alice/bob/charlie
- Create, edit, format, save, reopen documents
- Upload .md files, verify HTML conversion and sanitization
- Upload attachments, download, delete
- Share documents between alice and bob, test read/write permission enforcement
- Revoke access, verify document disappears
- Refresh browser, verify data persistence
- Paste long documents, verify scroll behavior
- Test in separate browser windows for multi-user sharing

### Code Review
- Senior-engineer-style review of all route handlers, middleware, components, and CSS
- 11 issues identified, 1 critical fix applied, 10 documented

---

## AI Impact Summary

| Metric | Value |
|---|---|
| Total development time | ~2 hours |
| AI-generated code | ~80% of codebase |
| Human-written code | ~5% (requirements, decisions) |
| AI-generated then changed | 4 components/functions |
| AI-generated then rejected | 2 approaches |
| Test passes on first run | 17/17 |
| Rounds of CSS debugging | 5 iterations |
