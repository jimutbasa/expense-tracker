// SPEC: Add Expense Form — controlled form for creating a new expense.
// Owns its own field state; calls onAdd(newExpense) on success and resets.

import { useState } from 'react';
import { createExpense } from '../api/expenses';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Other'];

// Returns today's date as "YYYY-MM-DD" in local time (for the date input default)
function todayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const INITIAL = {
  title:    '',
  amount:   '',
  category: 'Food',
  date:     todayString(),
};

// Props:
//   onAdd {fn} — called with the newly created Expense object after a successful POST
export default function AddExpenseForm({ onAdd }) {
  const [fields,      setFields]      = useState(INITIAL);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState(null);

  // Controlled input handler
  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  // Client-side gate: disable the submit button until every field is valid
  const isValid =
    fields.title.trim() !== '' &&
    Number(fields.amount) > 0 &&
    fields.category !== '' &&
    fields.date !== '';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const newExpense = await createExpense({
        title:    fields.title.trim(),
        amount:   parseFloat(fields.amount),
        category: fields.category,
        date:     fields.date,
      });

      onAdd(newExpense);                   // bubble up to <App />
      setFields({ ...INITIAL, date: todayString() }); // reset, keep today's date
    } catch (err) {
      // Surface the server's validation message when available
      const msg =
        err.response?.data?.details?.join(' · ') ||
        err.response?.data?.error ||
        'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h2 className="card-title">Add Expense</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid">

          {/* Title — full width */}
          <div className="form-group full-width">
            <label htmlFor="title">What did you spend on?</label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="e.g. Grocery run"
              maxLength={100}
              value={fields.title}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>

          {/* Amount */}
          <div className="form-group">
            <label htmlFor="amount">Amount ($)</label>
            <input
              id="amount"
              name="amount"
              type="number"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              value={fields.amount}
              onChange={handleChange}
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={fields.category}
              onChange={handleChange}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              name="date"
              type="date"
              value={fields.date}
              onChange={handleChange}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="form-error" role="alert">{error}</div>
          )}

          {/* Submit — full width, disabled until valid */}
          <div className="form-group full-width">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isValid || submitting}
            >
              {submitting ? 'Adding…' : '+ Add Expense'}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
