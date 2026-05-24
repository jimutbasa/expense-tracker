# Expense Tracker — Product Specification

> **Version:** 1.0  
> **Date:** 2026-05-24  
> **Status:** Draft

---

## 1. Overview

The Expense Tracker is a lightweight web application that lets users record and review their personal spending. Users can add new expenses with a title, amount, category, and date, and instantly see them listed on the main screen. The app provides a simple, fast way to stay aware of where money is going — no account required.

---

## 2. Core Features

- **Add an expense** — Submit a form with title, amount, category, and date to create a new expense record.
- **List all expenses** — View every recorded expense in reverse-chronological order (newest first).
- **Delete an expense** — Remove an individual expense record permanently with a single click.
- **Filter by category** — Narrow the expense list to a single category using a dropdown filter.
- **Running total** — Display the sum of all currently visible expenses (respects the active category filter).
- **Persistent storage** — All expenses are stored server-side (JSON file or database) so data survives page refreshes.
- **Responsive layout** — The UI works on both desktop and mobile screen sizes.

---

## 3. Data Model

Each **Expense** record contains the following fields:

| Field       | Type     | Required | Description                                                  |
|-------------|----------|----------|--------------------------------------------------------------|
| `id`        | string   | Yes      | Unique identifier (UUID v4). Generated server-side on creation. |
| `title`     | string   | Yes      | Short description of the expense (e.g. "Lunch at Chipotle"). Max 100 chars. |
| `amount`    | number   | Yes      | Cost in USD, stored as a float with 2 decimal places. Must be > 0. |
| `category`  | string   | Yes      | One of the allowed category values (see §4). |
| `date`      | string   | Yes      | The date the expense occurred, in `YYYY-MM-DD` format. |
| `createdAt` | string   | Yes      | ISO 8601 timestamp of when the record was created. Set server-side automatically. |

**Example record:**

```json
{
  "id": "a3f1c2d4-89ab-4e12-b456-426614174000",
  "title": "Grocery run",
  "amount": 54.37,
  "category": "Food",
  "date": "2026-05-23",
  "createdAt": "2026-05-23T18:42:00.000Z"
}
```

---

## 4. Categories

Expenses must be assigned to exactly one of the following categories:

| Value           | Description                                      |
|-----------------|--------------------------------------------------|
| `Food`          | Restaurants, groceries, coffee, snacks           |
| `Transport`     | Gas, rideshare, public transit, parking          |
| `Shopping`      | Clothing, electronics, household goods           |
| `Health`        | Pharmacy, gym, medical, dental                   |
| `Entertainment` | Movies, concerts, games, streaming subscriptions |
| `Other`         | Anything that doesn't fit the above categories   |

No other values are accepted. The API must reject requests with an unrecognised category.

---

## 5. API Endpoints

All endpoints are prefixed with `/api`. Request and response bodies are JSON.

### `GET /api/expenses`
Returns all expense records, sorted by `date` descending (newest first).

- **Query params:** none  
- **Response `200`:**
  ```json
  {
    "expenses": [ ...Expense ],
    "total": 312.50
  }
  ```

---

### `GET /api/expenses?category={category}`
Returns expenses filtered to the specified category.

- **Query params:** `category` — must match one of the allowed values in §4  
- **Response `200`:** same shape as GET all, but scoped to that category  
- **Response `400`:** if `category` value is not in the allowed list

---

### `POST /api/expenses`
Creates a new expense record.

- **Request body:**
  ```json
  {
    "title": "Lunch",
    "amount": 12.50,
    "category": "Food",
    "date": "2026-05-24"
  }
  ```
- **Response `201`:** the newly created Expense object (including server-generated `id` and `createdAt`)
- **Response `400`:** validation error (missing fields, bad category, amount ≤ 0, etc.)

---

### `DELETE /api/expenses/:id`
Permanently deletes the expense with the given `id`.

- **Path params:** `id` — the UUID of the expense to delete  
- **Response `200`:** `{ "message": "Deleted successfully" }`  
- **Response `404`:** if no expense with that `id` exists

---

## 6. UI Screens

The application is a **single-page interface** with no navigation or routing.

### Main Screen

The entire app lives on one page divided into two visual sections:

#### Top Section — Add Expense Form
A card/panel containing:
- **Title field** — text input, placeholder "What did you spend on?"
- **Amount field** — number input, placeholder "0.00", accepts decimals
- **Category dropdown** — lists all 6 allowed categories; defaults to "Food"
- **Date picker** — date input, defaults to today's date
- **Submit button** — labelled "Add Expense"; disabled while form fields are invalid or empty

Form resets to defaults after a successful submission.

#### Bottom Section — Expense List
Contains:
- **Category filter dropdown** — includes an "All Categories" option (default) plus the 6 category values; filters the list in real time
- **Total display** — shows "Total: $XXX.XX" reflecting the currently visible expenses
- **Expense list** — each row shows:
  - Expense title (bold)
  - Category badge (colour-coded by category)
  - Date (formatted as `MMM D, YYYY`, e.g. "May 23, 2026")
  - Amount (right-aligned, formatted as `$X.XX`)
  - Delete button (icon or small "✕" button); triggers a confirmation prompt before deleting
- **Empty state** — when there are no expenses (or none match the filter), shows a friendly message such as "No expenses yet. Add one above!"

---

## 7. Out of Scope

The following features are explicitly **not** part of this version and should not be built:

- **User authentication / login** — There is no concept of accounts; all data is global to the deployment.
- **Editing expenses** — Once an expense is created it can only be deleted, not modified.
- **Charts and visualisations** — No pie charts, bar graphs, or spending-over-time graphs.
- **Budget limits or alerts** — No thresholds, warnings, or notifications.
- **Export / import** — No CSV or PDF download functionality.
- **Multi-currency support** — USD only.
- **Recurring expenses** — No support for subscriptions or repeating entries.

---

*This specification is the single source of truth for the v1.0 build. Any feature not described here requires a spec update before implementation.*
