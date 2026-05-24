// SPEC: Total Display — shows the running sum of all currently visible expenses.
// Stateless; total is pre-computed and passed in by <App />.

// Props:
//   total        {number}  — sum of visible expenses
//   activeCategory {string} — "" or a category name, used to label the total
export default function TotalDisplay({ total, activeCategory }) {
  const label = activeCategory ? `${activeCategory} total` : 'Total';

  return (
    <div className="total-display">
      <span>{label}</span>
      ${total.toFixed(2)}
    </div>
  );
}
