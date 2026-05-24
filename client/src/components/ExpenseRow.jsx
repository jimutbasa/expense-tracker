// SPEC: Expense Row — renders a single expense: title, category badge, date, amount, delete button.

// Props:
//   expense  {Expense}  — { id, title, amount, category, date, createdAt }
//   onDelete {fn}       — called with expense.id after the user confirms deletion
export default function ExpenseRow({ expense, onDelete }) {
  const { id, title, amount, category, date } = expense;

  // Format "2026-05-23" → "May 23, 2026"
  // Append T00:00 to avoid timezone-shift on date-only strings
  const formattedDate = new Date(`${date}T00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  });

  function handleDelete() {
    if (window.confirm(`Delete "${title}"?`)) {
      onDelete(id);
    }
  }

  return (
    <div className="expense-row">
      {/* Left: title + meta */}
      <div className="expense-row-main">
        <div className="expense-title">{title}</div>
        <div className="expense-meta">
          <span className={`badge badge-${category}`}>{category}</span>
          <span className="expense-date">{formattedDate}</span>
        </div>
      </div>

      {/* Right: amount + delete */}
      <div className="expense-amount">${amount.toFixed(2)}</div>
      <button
        className="btn btn-delete"
        onClick={handleDelete}
        aria-label={`Delete ${title}`}
        title="Delete expense"
      >
        ✕
      </button>
    </div>
  );
}
