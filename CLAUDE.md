# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

### Starting the app (both servers must run simultaneously)

```bash
# From repo root
npm run dev:server       # Express on :3001 (node --watch, auto-restarts)
npm run start:client     # Vite dev server on :5173

# Or start production-style
npm run start:server     # node index.js (no watch)
```

### Testing

```bash
# Backend (Jest + supertest) — from /server
cd server && npm test

# Run a single backend test file
cd server && npx jest tests/api.test.js --runInBand

# Frontend (Vitest + RTL) — from /client
cd client && npm test           # run once
cd client && npm run test:watch # watch mode

# Run a single frontend test by name pattern
cd client && npx vitest run --reporter=verbose -t "CategoryFilter"
```

### Build & lint

```bash
cd client && npm run build   # Vite production build → client/dist/
cd client && npm run lint    # ESLint
```

### Install all dependencies from scratch

```bash
npm run install:all   # installs server/ and client/ node_modules in sequence
```

---

## Architecture

### Repo layout

Two independent npm workspaces under a thin root `package.json` that only holds convenience scripts. They are **not** linked — each has its own `node_modules`.

```
expense-tracker/
├── package.json          # root scripts only, no dependencies
├── server/               # CommonJS ("type": "commonjs")
└── client/               # ES Modules ("type": "module")
```

### Backend (`/server`)

**Entry point split — important for testing:**
- `index.js` — the only file that calls `app.listen()`. Only run in production.
- `app.js` — exports the fully configured Express app with no `listen()`. Imported by both `index.js` and supertest in tests.

This split exists because importing `index.js` in a test would bind a real port and conflict with supertest's ephemeral port allocation.

**Database lifecycle:**
`db.js` is a module-level singleton. When `require('./db')` is first called, it opens the SQLite connection, runs `CREATE TABLE IF NOT EXISTS`, creates indexes, and seeds three sample rows. All subsequent `require('./db')` calls return the cached instance.

In test mode (`NODE_ENV=test`), the DB path is `:memory:` instead of `data/expenses.db`, and seeding is skipped. The test setup file (`tests/setup.js`) sets `NODE_ENV=test` and is registered as a Jest `setupFiles` entry, which runs before any `require()` in the test file — this is what makes the in-memory branch work.

**Single source of truth for categories:**
`ALLOWED_CATEGORIES` is defined and exported from `db.js`. Both `middleware/validate.js` and `routes/expenses.js` import it from there. Never duplicate this list.

**snake_case ↔ camelCase boundary:**
SQLite stores `created_at`. The API always returns `createdAt`. The `rowToExpense()` helper in `routes/expenses.js` is the only place this mapping happens — keep it there.

**Request flow:**
```
HTTP request
  → cors + express.json() middleware (app.js)
  → validateCategoryQuery or validateExpenseBody (middleware/validate.js)
  → route handler (routes/expenses.js)
  → better-sqlite3 synchronous query (no async/await)
  → JSON response
```

### Frontend (`/client`)

**API calls never use `http://localhost:3001` directly.** All axios calls use relative paths (e.g. `/api/expenses`). Vite's dev server proxy in `vite.config.js` rewrites `/api/*` → `http://localhost:3001/api/*`. This means `client/src/api/expenses.js` works identically in dev and in a production reverse-proxy setup.

**State ownership — `App.jsx` is the only stateful component:**
- `expenses` — the full unfiltered list from the API
- `activeCategory` — the current filter string (`""` = all)
- `loading`, `error` — fetch/delete lifecycle

Filtering and total computation are done in `App.jsx` via `useMemo` and passed down as props. Child components are either stateless or own only local form state (`AddExpenseForm`).

**No re-fetches after mutation:**
- `handleAdd` prepends the new expense to state with `[newExpense, ...prev]`
- `handleDelete` removes with `prev.filter(e => e.id !== id)`

Neither triggers a GET. This keeps the UI snappy but means the list order after `handleAdd` may differ from the server's `ORDER BY date DESC` sort until the next page load (known DEV-03 deviation documented in `SPEC.md` compliance check).

**Frontend test isolation:**
`vi.mock('../api/expenses')` is hoisted by Vitest above all imports. Tests import the mocked `createExpense` and call `.mockResolvedValueOnce(...)` per test. `window.confirm` is stubbed with `vi.spyOn(window, 'confirm').mockReturnValue(true)` for delete tests and restored in `afterEach`.

### Key constraints from SPEC.md

- Categories are a closed enum — no new values without updating `ALLOWED_CATEGORIES` in `db.js` (the DB `CHECK` constraint will also need updating)
- No editing expenses — `PUT`/`PATCH` are explicitly out of scope
- No authentication — no user concept exists anywhere in the stack
- Amount must be `> 0` and stored as a float; display always uses `.toFixed(2)`
- Date stored as `YYYY-MM-DD` text; displayed as `MMM D, YYYY` via `toLocaleDateString`
