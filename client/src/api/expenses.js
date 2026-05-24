// SPEC: API layer — axios wrappers for all /api/expenses calls.
// Vite proxies /api/* → http://localhost:3001 in dev, so no hardcoded host needed.

import axios from 'axios';

const BASE = '/api/expenses';

/**
 * Fetch all expenses, optionally filtered by category.
 * @param {string} category  One of the 6 allowed values, or "" for all.
 * @returns {Promise<{ expenses: Expense[], total: number }>}
 */
export async function getExpenses(category = '') {
  const params = category ? { category } : {};
  const { data } = await axios.get(BASE, { params });
  return data;
}

/**
 * Create a new expense.
 * @param {{ title: string, amount: number, category: string, date: string }} payload
 * @returns {Promise<Expense>}  The created record with id and createdAt.
 */
export async function createExpense(payload) {
  const { data } = await axios.post(BASE, payload);
  return data;
}

/**
 * Delete an expense by id.
 * @param {string} id  UUID of the expense to remove.
 * @returns {Promise<{ message: string, id: string }>}
 */
export async function deleteExpense(id) {
  const { data } = await axios.delete(`${BASE}/${id}`);
  return data;
}
