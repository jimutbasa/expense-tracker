// SPEC: Category Filter — dropdown to narrow the expense list to one category.
// Stateless; fully controlled by <App />.

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Other'];

// Props:
//   value    {string}  — currently selected category, or "" for "All"
//   onChange {fn}      — called with the new category string when selection changes
export default function CategoryFilter({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filter by category"
    >
      <option value="">All Categories</option>
      {CATEGORIES.map((cat) => (
        <option key={cat} value={cat}>
          {cat}
        </option>
      ))}
    </select>
  );
}
