// db.js — Opens the SQLite connection and runs schema migrations on startup.
// Uses better-sqlite3 (synchronous driver — no async/await needed).

const Database = require('better-sqlite3');
const path = require('path');

// ---------------------------------------------------------------------------
// Allowed categories — single source of truth, shared with routes/validate
// ---------------------------------------------------------------------------
const ALLOWED_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Health',
  'Entertainment',
  'Other',
];

// ---------------------------------------------------------------------------
// Open (or create) the SQLite connection
// In test mode: use an in-memory DB — isolated, no files, no seed data.
// In dev/prod: use the persistent file on disk.
// ---------------------------------------------------------------------------
const IS_TEST = process.env.NODE_ENV === 'test';
const DB_PATH = IS_TEST ? ':memory:' : path.join(__dirname, 'data', 'expenses.db');
const db = new Database(DB_PATH);

// WAL mode only makes sense for file-backed databases
if (!IS_TEST) db.pragma('journal_mode = WAL');

// ---------------------------------------------------------------------------
// Schema — exactly as specified in DESIGN.md §3
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id         TEXT  PRIMARY KEY,
    title      TEXT  NOT NULL,
    amount     REAL  NOT NULL CHECK (amount > 0),
    category   TEXT  NOT NULL CHECK (category IN (
                 'Food', 'Transport', 'Shopping',
                 'Health', 'Entertainment', 'Other'
               )),
    date       TEXT  NOT NULL,
    created_at TEXT  NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category);
  CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses (date DESC);
`);

// ---------------------------------------------------------------------------
// Seed data — 3 sample expenses inserted only when the table is empty
// (INSERT OR IGNORE ensures restarts never duplicate them)
// ---------------------------------------------------------------------------
const seedExpenses = [
  {
    id:         'seed-0001-food-0000-000000000001',
    title:      'Weekly grocery run',
    amount:     87.45,
    category:   'Food',
    date:       '2026-05-22',
    created_at: '2026-05-22T10:00:00.000Z',
  },
  {
    id:         'seed-0002-tran-0000-000000000002',
    title:      'Uber to downtown',
    amount:     14.50,
    category:   'Transport',
    date:       '2026-05-23',
    created_at: '2026-05-23T08:30:00.000Z',
  },
  {
    id:         'seed-0003-ent-00000-000000000003',
    title:      'Netflix subscription',
    amount:     15.99,
    category:   'Entertainment',
    date:       '2026-05-24',
    created_at: '2026-05-24T00:00:00.000Z',
  },
];

const insertSeed = db.prepare(`
  INSERT OR IGNORE INTO expenses (id, title, amount, category, date, created_at)
  VALUES (@id, @title, @amount, @category, @date, @created_at)
`);

const seedAll = db.transaction((rows) => {
  for (const row of rows) insertSeed.run(row);
});

// Skip seeding in test mode — each test manages its own data via beforeEach
if (!IS_TEST) {
  seedAll(seedExpenses);
}

if (!IS_TEST) console.log(`[db] SQLite ready → ${DB_PATH}`);

module.exports = { db, ALLOWED_CATEGORIES };
