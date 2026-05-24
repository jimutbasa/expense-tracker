# Expense Tracker — Technical Design

> **Version:** 1.0  
> **Date:** 2026-05-24  
> **Based on:** SPEC.md v1.0

---

## 1. Folder Structure

```
expense-tracker/
├── SPEC.md
├── DESIGN.md
│
├── server/                         # Express backend
│   ├── package.json
│   ├── package-lock.json
│   ├── index.js                    # Entry point — starts the HTTP server
│   ├── db.js                       # Opens SQLite connection, runs migrations
│   ├── routes/
│   │   └── expenses.js             # All /api/expenses route handlers
│   ├── middleware/
│   │   └── validate.js             # Request validation (body, params, query)
│   └── data/
│       └── expenses.db             # SQLite database file (git-ignored)
│
└── client/                         # React frontend
    ├── package.json
    ├── package-lock.json
    ├── index.html                  # Vite HTML entry point
    ├── vite.config.js              # Vite config — proxies /api to Express
    └── src/
        ├── main.jsx                # React root — mounts <App />
        ├── App.jsx                 # Top-level component, owns expense state
        ├── api/
        │   └── expenses.js         # Axios wrappers for all API calls
        ├── components/
        │   ├── AddExpenseForm.jsx   # Controlled form for creating an expense
        │   ├── CategoryFilter.jsx   # Dropdown that filters the list
        │   ├── ExpenseList.jsx      # Maps over expenses, renders rows
        │   ├── ExpenseRow.jsx       # Single expense row with delete button
        │   └── TotalDisplay.jsx    # Shows the running total
        └── styles/
            └── index.css           # Global styles / CSS variables
```

---

## 2. Tech Stack

### Backend

| Library | Version | Why |
|---|---|---|
| **express** | ^4.18 | Minimal, unopinionated HTTP server. Perfect for a small REST API without boilerplate overhead. |
| **better-sqlite3** | ^9.x | Synchronous SQLite driver. No async complexity, zero config, single file database, fast for this scale. |
| **cors** | ^2.8 | One-liner middleware to allow the React dev server (port 5173) to call the API (port 3001) during development. |
| **uuid** | ^9.x | Generates RFC-compliant UUID v4 values for expense `id` fields server-side. |

### Frontend

| Library | Version | Why |
|---|---|---|
| **react** | ^18.x | Component model makes the form + list UI easy to reason about and update reactively. |
| **react-dom** | ^18.x | Required peer dep — renders React to the browser DOM. |
| **axios** | ^1.x | Cleaner API than `fetch` — automatic JSON parsing, consistent error objects, easy base URL config. |
| **vite** | ^5.x | Fast dev server with HMR and a `/api` proxy to Express, eliminating CORS issues in development. |

### No build-time database ORM — raw SQL is simple enough for a four-column table and keeps the dependency count low.

---

## 3. Database Schema

```sql
CREATE TABLE IF NOT EXISTS expenses (
  id         TEXT    PRIMARY KEY,           -- UUID v4 string
  title      TEXT    NOT NULL,              -- max 100 chars, enforced in app layer
  amount     REAL    NOT NULL CHECK (amount > 0),
  category   TEXT    NOT NULL CHECK (category IN (
               'Food', 'Transport', 'Shopping',
               'Health', 'Entertainment', 'Other'
             )),
  date       TEXT    NOT NULL,              -- stored as 'YYYY-MM-DD'
  created_at TEXT    NOT NULL               -- stored as ISO 8601 UTC string
);

-- Index to speed up category-filtered queries
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category);

-- Index to speed up default sort (newest date first)
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date DESC);
```

> **Note:** SQLite has no native `UUID` or `DATE` type. Both are stored as `TEXT` — this is idiomatic SQLite and works correctly for sorting because ISO date strings sort lexicographically.

---

## 4. API Design

**Base URL (dev):** `http://localhost:3001/api`  
**Content-Type:** `application/json` for all requests and responses.

---

### `GET /api/expenses`

Returns all expenses, newest date first. Optionally filtered by category.

**Query parameters:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `category` | string | No | Must be one of the 6 allowed values if provided |

**No request body.**

**Success `200`:**
```json
{
  "expenses": [
    {
      "id": "a3f1c2d4-89ab-4e12-b456-426614174000",
      "title": "Grocery run",
      "amount": 54.37,
      "category": "Food",
      "date": "2026-05-23",
      "createdAt": "2026-05-23T18:42:00.000Z"
    },
    {
      "id": "b7e9d1f2-12cd-4a56-c789-537725285111",
      "title": "Uber to airport",
      "amount": 32.00,
      "category": "Transport",
      "date": "2026-05-22",
      "createdAt": "2026-05-22T09:15:00.000Z"
    }
  ],
  "total": 86.37
}
```

**Error `400`** — invalid category query param:
```json
{
  "error": "Invalid category. Must be one of: Food, Transport, Shopping, Health, Entertainment, Other"
}
```

---

### `POST /api/expenses`

Creates a new expense. The server generates `id` and `createdAt`.

**Request body:**
```json
{
  "title": "Lunch",
  "amount": 12.50,
  "category": "Food",
  "date": "2026-05-24"
}
```

**Success `201`** — the full created record:
```json
{
  "id": "c1a2b3d4-56ef-7890-ab12-cd3456789012",
  "title": "Lunch",
  "amount": 12.50,
  "category": "Food",
  "date": "2026-05-24",
  "createdAt": "2026-05-24T13:00:00.000Z"
}
```

**Error `400`** — validation failure:
```json
{
  "error": "Validation failed",
  "details": [
    "title is required",
    "amount must be a number greater than 0"
  ]
}
```

---

### `DELETE /api/expenses/:id`

Permanently deletes a single expense by its UUID.

**Path parameter:** `id` — UUID of the expense to delete.  
**No request body.**

**Success `200`:**
```json
{
  "message": "Deleted successfully",
  "id": "c1a2b3d4-56ef-7890-ab12-cd3456789012"
}
```

**Error `404`** — no expense with that ID:
```json
{
  "error": "Expense not found",
  "id": "c1a2b3d4-56ef-7890-ab12-cd3456789012"
}
```

---

### Error envelope (all endpoints)

All error responses follow the same shape so the frontend can handle them uniformly:

```json
{
  "error": "Human-readable message",
  "details": ["optional array", "of specific field errors"]
}
```

`details` is omitted when there is only one error to report.

---

## 5. React Components

### `<App />`
**File:** `src/App.jsx`  
**Props:** none (root component)  
**State:**
- `expenses` — array of Expense objects fetched from the API
- `activeCategory` — string, the currently selected filter (`""` = all)
- `loading` — boolean, shows a loading indicator during fetch
- `error` — string or null, surface API errors

**Renders:**
- `<AddExpenseForm>` — to create new expenses
- `<CategoryFilter>` — to set `activeCategory`
- `<TotalDisplay>` — computed from filtered expenses
- `<ExpenseList>` — the filtered expense rows

**Responsibilities:** fetches expenses on mount, re-fetches after add/delete, computes the filtered list and passes it down as props.

---

### `<AddExpenseForm />`
**File:** `src/components/AddExpenseForm.jsx`

| Prop | Type | Description |
|---|---|---|
| `onAdd` | `(newExpense) => void` | Called with the created Expense after a successful POST |

**Internal state:** `title`, `amount`, `category`, `date` (controlled inputs).

**Renders:**
- Text input for title
- Number input for amount
- `<select>` for category (options: Food, Transport, Shopping, Health, Entertainment, Other)
- Date input defaulting to today
- Submit `<button>` — disabled when any field is empty or amount ≤ 0
- Inline error message if the API call fails

**On submit:** calls `api/expenses.js → createExpense()`, then calls `onAdd(result)` and resets form fields.

---

### `<CategoryFilter />`
**File:** `src/components/CategoryFilter.jsx`

| Prop | Type | Description |
|---|---|---|
| `value` | string | Currently active category (`""` for all) |
| `onChange` | `(category: string) => void` | Called when the user picks a new value |

**Renders:** a `<select>` with "All Categories" as the first option, followed by the 6 category values. Stateless — fully controlled by `<App />`.

---

### `<TotalDisplay />`
**File:** `src/components/TotalDisplay.jsx`

| Prop | Type | Description |
|---|---|---|
| `total` | number | Sum of visible expenses, pre-computed by `<App />` |

**Renders:** a single line — `Total: $54.37`. Formats `total` to 2 decimal places. Stateless.

---

### `<ExpenseList />`
**File:** `src/components/ExpenseList.jsx`

| Prop | Type | Description |
|---|---|---|
| `expenses` | `Expense[]` | The filtered array of expense objects |
| `onDelete` | `(id: string) => void` | Called when a row's delete button is confirmed |
| `loading` | boolean | If true, shows a loading skeleton instead of rows |

**Renders:**
- If `loading`: a loading indicator
- If `expenses.length === 0`: empty-state message ("No expenses yet. Add one above!")
- Otherwise: maps over `expenses` and renders one `<ExpenseRow>` per item

---

### `<ExpenseRow />`
**File:** `src/components/ExpenseRow.jsx`

| Prop | Type | Description |
|---|---|---|
| `expense` | `Expense` | The single expense object to display |
| `onDelete` | `(id: string) => void` | Bubbles up after the user confirms deletion |

**Renders** (in a single row):
- **Title** — bold text
- **Category badge** — coloured `<span>` (each category has a distinct background colour via CSS class)
- **Date** — formatted as "May 23, 2026"
- **Amount** — right-aligned, formatted as "$54.37"
- **Delete button** — "✕"; on click, calls `window.confirm("Delete this expense?")` and, if confirmed, calls `onDelete(expense.id)`

---

## 6. Data Flow

### Adding an Expense

```
User fills form → clicks "Add Expense"
        │
        ▼
<AddExpenseForm> validates fields client-side
  (title non-empty, amount > 0, category selected, date set)
        │
        ▼
api/expenses.js → axios.post('/api/expenses', { title, amount, category, date })
        │
        ▼
Express route handler (POST /api/expenses)
  1. validate.js middleware checks all required fields and types
  2. Rejects with 400 if invalid
  3. Generates id = uuidv4(), createdAt = new Date().toISOString()
  4. Runs: INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?)
  5. Returns the inserted record as JSON with status 201
        │
        ▼
axios resolves with the new Expense object
        │
        ▼
<App />.onAdd(newExpense) prepends it to the `expenses` state array
        │
        ▼
React re-renders:
  - <ExpenseList> shows the new row at the top
  - <TotalDisplay> updates the running total
  - <AddExpenseForm> resets to blank defaults
```

---

### Filtering by Category

```
User selects "Food" from <CategoryFilter>
        │
        ▼
onChange("Food") fires → <App /> sets activeCategory = "Food"
        │
        ▼
<App /> computes filteredExpenses:
  expenses.filter(e => e.category === "Food")   ← pure client-side, no API call
        │
        ▼
React re-renders:
  - <ExpenseList> shows only Food expenses
  - <TotalDisplay> shows sum of Food expenses only
```

> **Why client-side filter?** All expenses are already loaded into state on mount. Filtering locally avoids a round-trip and makes the UI feel instant. The `GET /api/expenses?category=` endpoint exists for direct API consumers or future server-side pagination needs.

---

### Deleting an Expense

```
User clicks "✕" on an expense row
        │
        ▼
<ExpenseRow> calls window.confirm("Delete this expense?")
  └─ User cancels → nothing happens
  └─ User confirms ↓
        │
        ▼
onDelete(expense.id) bubbles up to <App />
        │
        ▼
api/expenses.js → axios.delete(`/api/expenses/${id}`)
        │
        ▼
Express route handler (DELETE /api/expenses/:id)
  1. Looks up the row: SELECT id FROM expenses WHERE id = ?
  2. Returns 404 if not found
  3. Runs: DELETE FROM expenses WHERE id = ?
  4. Returns { message: "Deleted successfully", id }
        │
        ▼
axios resolves
        │
        ▼
<App /> sets expenses = expenses.filter(e => e.id !== id)
        │
        ▼
React re-renders:
  - Deleted row disappears from <ExpenseList>
  - <TotalDisplay> updates to reflect new sum
```

---

### Initial Page Load

```
Browser loads index.html → Vite serves React bundle
        │
        ▼
<App /> mounts → useEffect fires immediately
        │
        ▼
api/expenses.js → axios.get('/api/expenses')
  (Vite proxy rewrites /api/* → http://localhost:3001/api/*)
        │
        ▼
Express queries SQLite:
  SELECT * FROM expenses ORDER BY date DESC, created_at DESC
        │
        ▼
Returns { expenses: [...], total: N }
        │
        ▼
<App /> sets expenses = result.expenses, loading = false
        │
        ▼
React renders full UI with persisted data
```

---

*This design document is the implementation blueprint. Deviations from SPEC.md v1.0 are noted inline; all other behaviour follows the spec exactly.*
