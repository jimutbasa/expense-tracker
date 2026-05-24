// tests/components.test.jsx
// Unit tests for React components.
// SPEC reference: SPEC.md §2 (Core Features), §4 (Categories), §6 (UI Screens)
// DESIGN reference: DESIGN.md §5 (React Components)
//
// Globals (describe/test/expect/vi/beforeEach/afterEach) are injected by
// Vitest via `globals: true` in vite.config.js — no imports needed.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AddExpenseForm from '../components/AddExpenseForm';
import CategoryFilter  from '../components/CategoryFilter';
import ExpenseList     from '../components/ExpenseList';
import ExpenseRow      from '../components/ExpenseRow';
import TotalDisplay    from '../components/TotalDisplay';

// ---------------------------------------------------------------------------
// Mock the API module so no real HTTP requests are made during tests.
// vi.mock() is hoisted by Vitest above all imports automatically.
// ---------------------------------------------------------------------------
vi.mock('../api/expenses', () => ({
  createExpense: vi.fn(),
}));

// Import the mock AFTER vi.mock() so we get the mocked version.
import { createExpense } from '../api/expenses';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const MOCK_EXPENSES = [
  {
    id:        'a1b2c3',
    title:     'Morning coffee',
    amount:    4.50,
    category:  'Food',
    date:      '2026-05-24',
    createdAt: '2026-05-24T08:00:00.000Z',
  },
  {
    id:        'd4e5f6',
    title:     'Bus fare',
    amount:    2.00,
    category:  'Transport',
    date:      '2026-05-23',
    createdAt: '2026-05-23T09:15:00.000Z',
  },
  {
    id:        'g7h8i9',
    title:     'Gym membership',
    amount:    49.99,
    category:  'Health',
    date:      '2026-05-22',
    createdAt: '2026-05-22T07:30:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// Reset mocks between tests so call counts don't bleed across
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks(); // restores any vi.spyOn() (e.g. window.confirm)
});

// ===========================================================================
// AddExpenseForm
// ===========================================================================
describe('AddExpenseForm', () => {

  // ── Test 1 ────────────────────────────────────────────────────────────────
  test('SPEC: ExpenseForm submits title, amount, category and date', async () => {
    const user  = userEvent.setup();
    const onAdd = vi.fn();

    // API returns a fully-formed expense on success
    createExpense.mockResolvedValueOnce({
      id:        'new-uuid-001',
      title:     'Morning coffee',
      amount:    4.50,
      category:  'Food',
      date:      '2026-05-24',
      createdAt: '2026-05-24T08:00:00.000Z',
    });

    render(<AddExpenseForm onAdd={onAdd} />);

    // Fill in the title field
    // DESIGN.md §5: label text is "What did you spend on?"
    await user.type(
      screen.getByLabelText(/what did you spend on\?/i),
      'Morning coffee',
    );

    // Fill in the amount field
    // DESIGN.md §5: label text is "Amount ($)"
    const amountInput = screen.getByLabelText(/amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '4.50');

    // Category defaults to "Food" and date defaults to today —
    // both satisfy the isValid check already.

    // Button should now be enabled (all fields valid)
    const submitBtn = screen.getByRole('button', { name: /add expense/i });
    expect(submitBtn).not.toBeDisabled();

    // Click submit
    await user.click(submitBtn);

    // DESIGN.md §6 (Add flow): createExpense is called with exact field values
    await waitFor(() => {
      expect(createExpense).toHaveBeenCalledTimes(1);
      expect(createExpense).toHaveBeenCalledWith({
        title:    'Morning coffee',
        amount:   4.50,
        category: 'Food',
        date:     expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
      });
    });

    // onAdd is called with the expense the API returned
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new-uuid-001', title: 'Morning coffee' }),
    );
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  test('SPEC: ExpenseForm shows error if amount is empty', async () => {
    const user = userEvent.setup();
    render(<AddExpenseForm onAdd={vi.fn()} />);

    // Fill in the title but leave amount blank
    await user.type(
      screen.getByLabelText(/what did you spend on\?/i),
      'Groceries',
    );

    // SPEC §6 (UI Screens): "Submit button — disabled while form fields are invalid or empty"
    const submitBtn = screen.getByRole('button', { name: /add expense/i });
    expect(submitBtn).toBeDisabled();

    // Clicking a disabled button must never call the API
    await user.click(submitBtn);
    expect(createExpense).not.toHaveBeenCalled();
  });

});

// ===========================================================================
// ExpenseList
// ===========================================================================
describe('ExpenseList', () => {

  // ── Test 3 ────────────────────────────────────────────────────────────────
  test('SPEC: ExpenseList renders a list of expenses', () => {
    render(
      <ExpenseList
        expenses={MOCK_EXPENSES}
        onDelete={vi.fn()}
        loading={false}
      />,
    );

    // Every expense title should be visible
    expect(screen.getByText('Morning coffee')).toBeInTheDocument();
    expect(screen.getByText('Bus fare')).toBeInTheDocument();
    expect(screen.getByText('Gym membership')).toBeInTheDocument();

    // Every formatted amount should be visible
    expect(screen.getByText('$4.50')).toBeInTheDocument();
    expect(screen.getByText('$2.00')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();

    // Every category badge should be visible
    // (ExpenseRow renders a badge for each category)
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
  });

  // ── Test 4 ────────────────────────────────────────────────────────────────
  test('SPEC: ExpenseList shows total amount of all expenses', () => {
    // DESIGN.md §5: TotalDisplay is the component that renders the running total.
    // It lives alongside ExpenseList in the "bottom section" of the UI (App.jsx)
    // and receives the pre-computed sum as a prop from <App />.
    const total = MOCK_EXPENSES.reduce((sum, e) => sum + e.amount, 0);
    // 4.50 + 2.00 + 49.99 = 56.49

    render(<TotalDisplay total={total} activeCategory="" />);

    // SPEC §2: "Running total — Display the sum of all currently visible expenses"
    expect(screen.getByText(/\$56\.49/)).toBeInTheDocument();
    // Label should read "Total" when no category filter is active
    expect(screen.getByText(/total/i)).toBeInTheDocument();
  });

});

// ===========================================================================
// CategoryFilter
// ===========================================================================
describe('CategoryFilter', () => {

  // ── Test 5 ────────────────────────────────────────────────────────────────
  test('SPEC: CategoryFilter renders all 6 categories from spec', () => {
    render(<CategoryFilter value="" onChange={vi.fn()} />);

    // SPEC §4: the six allowed categories
    const specCategories = [
      'Food',
      'Transport',
      'Shopping',
      'Health',
      'Entertainment',
      'Other',
    ];

    specCategories.forEach((cat) => {
      expect(
        screen.getByRole('option', { name: cat }),
      ).toBeInTheDocument();
    });

    // The "All Categories" default option must also be present
    expect(
      screen.getByRole('option', { name: 'All Categories' }),
    ).toBeInTheDocument();

    // Total options = 6 categories + 1 "All Categories" = 7
    expect(screen.getAllByRole('option')).toHaveLength(7);
  });

});

// ===========================================================================
// ExpenseRow — delete button
// ===========================================================================
describe('ExpenseRow', () => {

  // ── Test 6 ────────────────────────────────────────────────────────────────
  test('SPEC: DeleteButton calls delete handler when clicked', async () => {
    const user     = userEvent.setup();
    const onDelete = vi.fn();
    const expense  = MOCK_EXPENSES[0]; // { id: 'a1b2c3', title: 'Morning coffee', ... }

    // window.confirm must return true for onDelete to be invoked
    // DESIGN.md §5: "triggers a confirmation prompt before deleting"
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ExpenseRow expense={expense} onDelete={onDelete} />);

    // DESIGN.md §5: delete button has aria-label "Delete {title}"
    const deleteBtn = screen.getByRole('button', { name: /delete morning coffee/i });
    await user.click(deleteBtn);

    // The confirmation dialog was shown with the correct message
    expect(window.confirm).toHaveBeenCalledWith('Delete "Morning coffee"?');

    // onDelete was called exactly once with the expense's id
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('a1b2c3');
  });

});
