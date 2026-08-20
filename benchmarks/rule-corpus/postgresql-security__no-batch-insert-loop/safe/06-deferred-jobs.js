/**
 * SAFE - The loop builds THUNKS. No query runs here; the arrow is a value
 * pushed onto an array, and what schedules it decides the concurrency. Blaming
 * the enclosing loop for a lambda it merely constructs is a lexical accident,
 * not evidence.
 */
const { Pool } = require('pg');

const pool = new Pool();

function buildJobs(accounts) {
  const jobs = [];
  for (const account of accounts) {
    jobs.push(() => pool.query('UPDATE accounts SET synced_at = now() WHERE id = $1', [account.id]));
  }
  return jobs;
}

module.exports = { buildJobs };
