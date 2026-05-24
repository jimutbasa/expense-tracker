// index.js — Production entry point. Imports the configured app and starts listening.
// Tests import app.js directly so this file is never executed during test runs.

require('dotenv').config();
require('./db'); // trigger schema creation + seeding

const app  = require('./app');
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[server] Express running on http://localhost:${PORT}`);
  console.log(`[server] Health check → http://localhost:${PORT}/health`);
  console.log(`[server] API base     → http://localhost:${PORT}/api/expenses`);
});
