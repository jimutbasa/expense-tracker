// SPEC: Expense List Screen — renders the full list of visible expenses,
// or a loading indicator, or an empty-state message.

import ExpenseRow from './ExpenseRow';

// Props:
//   expenses  {Expense[]}  — filtered array passed down from <App />
//   onDelete  {fn}         — bubbled up to <App /> when a row is deleted
//   loading   {boolean}    — true while the initial fetch is in-flight
export default function ExpenseList({ expenses, onDelete, loading }) {
  if (loading) {
    return (
      <div className="loading-state">
        Loading expenses…
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">💸</span>
        <p>No expenses yet. Add one above!</p>
      </div>
    );
  }

  return (
    <div className="expense-list">
      {expenses.map((expense) => (
        <ExpenseRow
          key={expense.id}
          expense={expense}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
