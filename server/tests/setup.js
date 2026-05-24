// tests/setup.js — Runs before every test FILE in the Jest worker.
// Setting NODE_ENV here ensures db.js picks up the in-memory path
// when it is first require()'d by app.js or the test file itself.
process.env.NODE_ENV = 'test';
