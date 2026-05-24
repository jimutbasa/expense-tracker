// middleware/validate.js — Request validation for all /api/expenses routes.
// Returns a 400 with a structured error envelope on any violation.

const { ALLOWED_CATEGORIES } = require('../db');

// ---------------------------------------------------------------------------
// Validate POST /api/expenses body
// SPEC: title required, amount > 0, category in allowed list, date required
// ---------------------------------------------------------------------------
function validateExpenseBody(req, res, next) {
  const { title, amount, category, date } = req.body;
  const details = [];

  // title — must be a non-empty string, max 100 chars
  if (!title || typeof title !== 'string' || title.trim() === '') {
    details.push('title is required and must be a non-empty string');
  } else if (title.trim().length > 100) {
    details.push('title must be 100 characters or fewer');
  }

  // amount — must be a positive number
  if (amount === undefined || amount === null || amount === '') {
    details.push('amount is required');
  } else if (typeof amount !== 'number' || isNaN(amount)) {
    details.push('amount must be a number');
  } else if (amount <= 0) {
    details.push('amount must be greater than 0');
  }

  // category — must be one of the six allowed values
  if (!category || typeof category !== 'string') {
    details.push(`category is required. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`);
  } else if (!ALLOWED_CATEGORIES.includes(category)) {
    details.push(`Invalid category "${category}". Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`);
  }

  // date — must be present and match YYYY-MM-DD
  if (!date || typeof date !== 'string' || date.trim() === '') {
    details.push('date is required (YYYY-MM-DD)');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    details.push('date must be in YYYY-MM-DD format');
  }

  if (details.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details });
  }

  next();
}

// ---------------------------------------------------------------------------
// Validate ?category= query param on GET /api/expenses
// SPEC: if provided, must be one of the six allowed values
// ---------------------------------------------------------------------------
function validateCategoryQuery(req, res, next) {
  const { category } = req.query;

  if (category !== undefined && !ALLOWED_CATEGORIES.includes(category)) {
    return res.status(400).json({
      error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`,
    });
  }

  next();
}

module.exports = { validateExpenseBody, validateCategoryQuery };
