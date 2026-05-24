// SPEC: Main App — owns all expense state, fetches on mount,
// computes filtered list and total, wires all components together.

import { useState, useEffect, useMemo } from 'react';
import { getExpenses, deleteExpense } from './api/expenses';

import AddExpenseForm  from './components/AddExpenseForm';
import CategoryFilter  from './components/CategoryFilter';
import TotalDisplay    from './components/TotalDisplay';
import ExpenseList     from './components/ExpenseList';

export default function App() {
  // ── State ────────────────────────────────────────────────────────────────
  const [expenses,        setExpenses]        = useState([]);   // all records from API
  const [activeCategory,  setActiveCategory]  = useState('');   // "" = show all
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);

  // ── Initial fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchAll() {
      try {
        const { expenses: data } = await getExpenses();
        setExpenses(data);
      } catch (err) {
        setError('Could not load expenses. Is the server running?');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // ── Derived state (client-side filter) ───────────────────────────────────
  // DESIGN.md §6: filtering is pure client-side — no extra API call needed
  const filteredExpenses = useMemo(() => {
    if (!activeCategory) return expenses;
    return expenses.filter((e) => e.category === activeCategory);
  }, [expenses, activeCategory]);

  const total = useMemo(
    () => Math.round(filteredExpenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100,
    [filteredExpenses]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  // Called by <AddExpenseForm> after a successful POST
  // DESIGN.md §6: prepend to state — no re-fetch needed
  function handleAdd(newExpense) {
    setExpenses((prev) => [newExpense, ...prev]);
  }

  // Called by <ExpenseRow> after the user confirms deletion
  // DESIGN.md §6: filter out client-side — no re-fetch needed
  async function handleDelete(id) {
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        'Could not delete expense. Please try again.';
      setError(msg);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app">

      {/* Header */}
      <header className="app-header">
        <h1>💰 Expense Tracker</h1>
        <p>Track your spending, one entry at a time.</p>
      </header>

      {/* App-level error banner (fetch / delete failures) */}
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {/* Top section: add form */}
      <AddExpenseForm onAdd={handleAdd} />

      {/* Bottom section: filter + total + list */}
      <div className="card">
        <div className="list-toolbar">
          <CategoryFilter
            value={activeCategory}
            onChange={setActiveCategory}
          />
          <TotalDisplay
            total={total}
            activeCategory={activeCategory}
          />
        </div>

        <ExpenseList
          expenses={filteredExpenses}
          onDelete={handleDelete}
          loading={loading}
        />
      </div>

    </div>
  );
}
