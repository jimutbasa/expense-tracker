# 💰 Expense Tracker

A full-stack web application for recording and reviewing personal spending. Add expenses by title, amount, category, and date — then filter, view totals, and delete entries from a clean single-page interface. No account required.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [How to Run](#how-to-run)
- [API Reference](#api-reference)
- [Folder Structure](#folder-structure)
- [How This Was Built](#how-this-was-built)
- [What's Next](#whats-next)

---

## Project Overview

Expense Tracker lets you:

- **Add expenses** with a title, amount, category, and date
- **View all expenses** sorted newest-first with a live running total
- **Filter by category** — Food, Transport, Shopping, Health, Entertainment, or Other
- **Delete any expense** with a single click (plus a confirmation prompt)
- **Persist data** across page refreshes — everything is stored in a SQLite database

The entire app lives on one page. No login, no editing, no charts — just fast, simple expense recording.

---

## Tech Stack

### Backend

| Library | Purpose |
|---|---|
| **Express 5** | HTTP server and REST API routing |
| **better-sqlite3** | Synchronous SQLite driver — no async complexity, single-file database |
| **cors** | Allows the React dev server (port 5173) to call the API (port 3001) |
| **uuid** | Generates UUID v4 values for expense IDs server-side |
| **dotenv** | Loads environment variables from `.env` |

### Frontend

| Library | Purpose |
|---|---|
| **React 19** | Component-based UI with hooks for state management |
| **Vite** | Dev server with HMR and an `/api` proxy to Express |
| **axios** | HTTP client for API calls — automatic JSON parsing and consistent errors |

### Testing

| Library | Purpose |
|---|---|
| **Jest + supertest** | Backend integration tests — hits real Express routes against an in-memory SQLite DB |
| **Vitest + React Testing Library** | Frontend component tests — renders components in jsdom and simulates user interaction |

---

## How to Run

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)

### 1. Clone the repository

```bash
git clone https://github.com/jimutbasa/expense-tracker.git
cd expense-tracker
```

### 2. Install dependencies

```bash
# Install both server and client dependencies in one command
npm run install:all
```

### 3. Start the backend

Open a terminal and run:

```bash
npm run dev:server
```

You should see:
```
[db] SQLite ready → .../server/data/expenses.db
[server] Express running on http://localhost:3001
[server] API base → http://localhost:3001/api/expenses
```

### 4. Start the frontend

Open a **second** terminal and run:

```bash
npm run start:client
```

Then open **http://localhost:5173** in your browser.

> **Note:** Both servers must be running at the same time. The frontend proxies all `/api/*` requests to the backend automatically — no configuration needed.

### 5. Run the tests

```bash
# Backend tests (Jest + supertest)
cd server && npm test

# Frontend tests (Vitest + React Testing Library)
cd client && npm test
```

---

## API Reference

**Base URL:** `http://localhost:3001/api`  
All requests and responses use `Content-Type: application/json`.

---

### `GET /api/expenses`

Returns all expenses sorted newest-first. Pass an optional `?category=` query parameter to filter.

**Query parameters:**

| Param | Required | Description |
|---|---|---|
| `category` | No | One of: `Food`, `Transport`, `Shopping`, `Health`, `Entertainment`, `Other` |

**Example request:**
```bash
curl http://localhost:3001/api/expenses
curl "http://localhost:3001/api/expenses?category=Food"
```

**Response `200`:**
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
    }
  ],
  "total": 54.37
}
```

**Error `400`** — invalid category:
```json
{
  "error": "Invalid category. Must be one of: Food, Transport, Shopping, Health, Entertainment, Other"
}
```

---

### `POST /api/expenses`

Creates a new expense. The server generates `id` and `createdAt` automatically.

**Example request:**
```bash
curl -X POST http://localhost:3001/api/expenses \
  -H "Content-Type: application/json" \
  -d '{"title": "Lunch", "amount": 12.50, "category": "Food", "date": "2026-05-24"}'
```

**Request body:**

| Field | Type | Rules |
|---|---|---|
| `title` | string | Required. Max 100 characters. |
| `amount` | number | Required. Must be greater than 0. |
| `category` | string | Required. Must be one of the 6 allowed values. |
| `date` | string | Required. Format: `YYYY-MM-DD`. |

**Response `201`:**
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
    "title is required and must be a non-empty string",
    "amount must be greater than 0"
  ]
}
```

---

### `DELETE /api/expenses/:id`

Permanently deletes the expense with the given ID.

**Example request:**
```bash
curl -X DELETE http://localhost:3001/api/expenses/c1a2b3d4-56ef-7890-ab12-cd3456789012
```

**Response `200`:**
```json
{
  "message": "Deleted successfully",
  "id": "c1a2b3d4-56ef-7890-ab12-cd3456789012"
}
```

**Error `404`** — expense not found:
```json
{
  "error": "Expense not found",
  "id": "c1a2b3d4-56ef-7890-ab12-cd3456789012"
}
```

---

## Folder Structure

```
expense-tracker/
├── SPEC.md                         # Product requirements
├── DESIGN.md                       # Technical design and API contract
├── CLAUDE.md                       # AI assistant guidance for this repo
├── package.json                    # Root scripts (start, install:all)
│
├── server/                         # Express backend (CommonJS)
│   ├── index.js                    # Starts the HTTP server on :3001
│   ├── app.js                      # Configures Express (no listen — for testing)
│   ├── db.js                       # SQLite connection, schema, seed data
│   ├── routes/
│   │   └── expenses.js             # GET, POST, DELETE route handlers
│   ├── middleware/
│   │   └── validate.js             # Request validation middleware
│   ├── tests/
│   │   ├── api.test.js             # Integration tests (7 tests)
│   │   └── setup.js                # Sets NODE_ENV=test for in-memory DB
│   └── data/
│       └── expenses.db             # SQLite file (created on first run, git-ignored)
│
└── client/                         # React frontend (ES Modules)
    ├── index.html
    ├── vite.config.js              # Proxies /api/* → localhost:3001
    └── src/
        ├── main.jsx                # React entry point
        ├── App.jsx                 # Root component — owns all state
        ├── api/
        │   └── expenses.js         # axios wrappers: getExpenses, createExpense, deleteExpense
        ├── components/
        │   ├── AddExpenseForm.jsx  # Controlled form with validation
        │   ├── CategoryFilter.jsx  # Dropdown filter (stateless)
        │   ├── ExpenseList.jsx     # List with loading/empty states
        │   ├── ExpenseRow.jsx      # Single row: title, badge, date, amount, delete
        │   └── TotalDisplay.jsx    # Running total (stateless)
        ├── styles/
        │   └── index.css           # All styles — CSS variables, badges, responsive
        └── tests/
            ├── components.test.jsx # Component unit tests (6 tests)
            └── setup.js            # Loads @testing-library/jest-dom matchers
```

---

## How This Was Built

This project was built using **Spec Driven Development** — a discipline where every implementation decision flows from a written specification rather than being made on the fly. The process started with `SPEC.md`, a plain-English document defining exactly what the app does, what categories are allowed, what the data model looks like, what each API endpoint returns, and what is explicitly *out of scope*. From there, `DESIGN.md` translated those requirements into concrete technical decisions: the folder structure, database schema with exact SQL, component props, API response shapes with JSON examples, and data flow diagrams. Only after both documents were reviewed and agreed upon did any code get written. The result is a codebase where every file traces directly back to a documented requirement — there are no surprise features, no guessed-at field names, and no ambiguity about what "done" means.

---

## What's Next

These features were intentionally left out of v1.0 (see `SPEC.md §7`) but would be natural next iterations:

**1. Edit an expense**
Add a `PUT /api/expenses/:id` endpoint and an inline edit form in `ExpenseRow`. The data model already has all the fields needed — no schema changes required.

**2. Spending charts**
A pie or bar chart breaking down spending by category for the current month. The filtered totals-by-category can be computed client-side from the already-loaded `expenses` state — no new API endpoint needed. A library like [Recharts](https://recharts.org/) drops straight into the React component tree.

**3. Monthly budget limits**
Let users set a spending limit per category (stored in a new `budgets` table). `TotalDisplay` could show a progress bar and turn red when a limit is exceeded. The backend already validates categories against a fixed enum, making it straightforward to join against a budgets table in the existing GET query.
