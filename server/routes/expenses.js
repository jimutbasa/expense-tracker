// routes/expenses.js — All /api/expenses route handlers.
// Mounted at /api/expenses in index.js.

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db, ALLOWED_CATEGORIES } = require('../db');
const { validateExpenseBody, validateCategoryQuery } = require('../middleware/validate');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helper — map a DB row (snake_case) to the API response shape (camelCase)
// ---------------------------------------------------------------------------
function rowToExpense(row) {
  return {
    id:        row.id,
    title:     row.title,
    amount:    row.amount,
    category:  row.category,
    date:      row.date,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Helper — compute the sum of an array of expense objects
// ---------------------------------------------------------------------------
function computeTotal(expenses) {
  return Math.round(expenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;
}

// ---------------------------------------------------------------------------
// GET /api/expenses
// SPEC: GET all expenses — returns all records, newest date first.
//       Optional ?category= query param filters to one category.
// ---------------------------------------------------------------------------
router.get('/', validateCategoryQuery, (req, res) => {
  const { category } = req.query;

  let rows;

  if (category) {
    // SPEC: GET by category — filtered list, same response shape
    rows = db
      .prepare(
        `SELECT * FROM expenses
         WHERE category = ?
         ORDER BY date DESC, created_at DESC`
      )
      .all(category);
  } else {
    rows = db
      .prepare(
        `SELECT * FROM expenses
         ORDER BY date DESC, created_at DESC`
      )
      .all();
  }

  const expenses = rows.map(rowToExpense);

  res.json({
    expenses,
    total: computeTotal(expenses),
  });
});

// ---------------------------------------------------------------------------
// POST /api/expenses
// SPEC: POST new expense — validates body, inserts record, returns 201 + full record.
// ---------------------------------------------------------------------------
router.post('/', validateExpenseBody, (req, res) => {
  const { title, amount, category, date } = req.body;

  const newExpense = {
    id:        uuidv4(),
    title:     title.trim(),
    amount:    parseFloat(amount.toFixed(2)),
    category,
    date:      date.trim(),
    created_at: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO expenses (id, title, amount, category, date, created_at)
     VALUES (@id, @title, @amount, @category, @date, @created_at)`
  ).run(newExpense);

  res.status(201).json(rowToExpense(newExpense));
});

// ---------------------------------------------------------------------------
// DELETE /api/expenses/:id
// SPEC: DELETE one expense — removes by UUID, 404 if not found.
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // Check the row exists before deleting
  const existing = db
    .prepare('SELECT id FROM expenses WHERE id = ?')
    .get(id);

  if (!existing) {
    return res.status(404).json({
      error: 'Expense not found',
      id,
    });
  }

  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);

  res.json({ message: 'Deleted successfully', id });
});

module.exports = router;
