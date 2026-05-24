// tests/api.test.js — Integration tests for the Express backend.
// Uses supertest to make real HTTP requests against the app.
// Uses an in-memory SQLite database (NODE_ENV=test, set in tests/setup.js).
//
// SPEC reference: SPEC.md §5 (API Endpoints) + DESIGN.md §4 (API Design)

const request  = require('supertest');
const app      = require('../app');
const { db }   = require('../db');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a valid expense payload, with optional field overrides. */
function makeExpense(overrides = {}) {
  return {
    title:    'Morning coffee',
    amount:   4.50,
    category: 'Food',
    date:     '2026-05-24',
    ...overrides,
  };
}

/**
 * POSTs a valid expense and returns the created record.
 * Used to seed state for GET / DELETE tests.
 */
async function createExpense(overrides = {}) {
  const res = await request(app)
    .post('/api/expenses')
    .send(makeExpense(overrides));
  return res.body; // { id, title, amount, category, date, createdAt }
}

// ---------------------------------------------------------------------------
// Lifecycle — wipe the table before every test so tests never share state
// ---------------------------------------------------------------------------
beforeEach(() => {
  db.prepare('DELETE FROM expenses').run();
});

afterAll(() => {
  db.close();
});

// ===========================================================================
// POST /api/expenses
// ===========================================================================
describe('POST /api/expenses', () => {

  test('SPEC: Can add a new expense with valid fields', async () => {
    const payload = makeExpense({
      title:    'Gym membership',
      amount:   49.99,
      category: 'Health',
      date:     '2026-05-20',
    });

    const res = await request(app)
      .post('/api/expenses')
      .send(payload)
      .expect(201)
      .expect('Content-Type', /json/);

    // DESIGN.md §4: response must be the full record with server-generated fields
    expect(res.body.id).toBeDefined();           // UUID generated server-side
    expect(res.body.createdAt).toBeDefined();    // ISO 8601 timestamp
    expect(res.body.title).toBe('Gym membership');
    expect(res.body.amount).toBe(49.99);
    expect(res.body.category).toBe('Health');
    expect(res.body.date).toBe('2026-05-20');
  });

  // -------------------------------------------------------------------------

  test('SPEC: Cannot add expense with missing title', async () => {
    const payload = makeExpense({ title: '' }); // empty string → invalid

    const res = await request(app)
      .post('/api/expenses')
      .send(payload)
      .expect(400)
      .expect('Content-Type', /json/);

    // DESIGN.md §4: error envelope shape
    expect(res.body.error).toBe('Validation failed');
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details.some(d => d.toLowerCase().includes('title'))).toBe(true);
  });

  // -------------------------------------------------------------------------

  test('SPEC: Cannot add expense with negative amount', async () => {
    const payload = makeExpense({ amount: -10 });

    const res = await request(app)
      .post('/api/expenses')
      .send(payload)
      .expect(400)
      .expect('Content-Type', /json/);

    expect(res.body.error).toBe('Validation failed');
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details.some(d => d.toLowerCase().includes('amount'))).toBe(true);
  });

});

// ===========================================================================
// GET /api/expenses
// ===========================================================================
describe('GET /api/expenses', () => {

  test('SPEC: Can retrieve all expenses', async () => {
    // Seed two expenses with known values
    await createExpense({ title: 'Lunch',    amount: 12.00, category: 'Food'      });
    await createExpense({ title: 'Bus fare', amount:  2.50, category: 'Transport' });

    const res = await request(app)
      .get('/api/expenses')
      .expect(200)
      .expect('Content-Type', /json/);

    // DESIGN.md §4: response shape is { expenses: [...], total: number }
    expect(Array.isArray(res.body.expenses)).toBe(true);
    expect(res.body.expenses).toHaveLength(2);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.total).toBeCloseTo(14.50, 2);

    // SPEC.md §3: each record has the correct fields
    const first = res.body.expenses[0];
    expect(first).toMatchObject({
      id:        expect.any(String),
      title:     expect.any(String),
      amount:    expect.any(Number),
      category:  expect.any(String),
      date:      expect.any(String),
      createdAt: expect.any(String),
    });

    // SPEC.md §2: sorted newest-first (Bus was created after Lunch)
    expect(res.body.expenses[0].title).toBe('Bus fare');
    expect(res.body.expenses[1].title).toBe('Lunch');
  });

  // -------------------------------------------------------------------------

  test('SPEC: Can filter expenses by category', async () => {
    // Seed a mix of categories
    await createExpense({ title: 'Groceries', amount: 55.00, category: 'Food'          });
    await createExpense({ title: 'Uber',      amount: 14.00, category: 'Transport'     });
    await createExpense({ title: 'Dinner',    amount: 30.00, category: 'Food'          });
    await createExpense({ title: 'Netflix',   amount: 16.00, category: 'Entertainment' });

    const res = await request(app)
      .get('/api/expenses?category=Food')
      .expect(200)
      .expect('Content-Type', /json/);

    // Only Food expenses returned
    expect(res.body.expenses).toHaveLength(2);
    expect(res.body.expenses.every(e => e.category === 'Food')).toBe(true);

    // Total must reflect only the visible expenses
    expect(res.body.total).toBeCloseTo(85.00, 2);

    // DESIGN.md §4: invalid category → 400
    const badRes = await request(app)
      .get('/api/expenses?category=Nonsense')
      .expect(400);
    expect(badRes.body.error).toMatch(/invalid category/i);
  });

});

// ===========================================================================
// DELETE /api/expenses/:id
// ===========================================================================
describe('DELETE /api/expenses/:id', () => {

  test('SPEC: Can delete an expense by id', async () => {
    // Create an expense, then delete it
    const created = await createExpense({ title: 'One-off purchase', amount: 99.00 });
    const { id }  = created;

    const res = await request(app)
      .delete(`/api/expenses/${id}`)
      .expect(200)
      .expect('Content-Type', /json/);

    // DESIGN.md §4: success response shape
    expect(res.body.message).toBe('Deleted successfully');
    expect(res.body.id).toBe(id);

    // Confirm the record is actually gone from the database
    const listRes = await request(app).get('/api/expenses');
    const stillExists = listRes.body.expenses.some(e => e.id === id);
    expect(stillExists).toBe(false);

    // And the total is now $0
    expect(listRes.body.total).toBe(0);
  });

  // -------------------------------------------------------------------------

  test('SPEC: Returns 404 when deleting non-existent expense', async () => {
    const res = await request(app)
      .delete('/api/expenses/00000000-0000-0000-0000-does-not-exist')
      .expect(404)
      .expect('Content-Type', /json/);

    // DESIGN.md §4: error envelope shape for 404
    expect(res.body.error).toBe('Expense not found');
    expect(res.body.id).toBeDefined();
  });

});
