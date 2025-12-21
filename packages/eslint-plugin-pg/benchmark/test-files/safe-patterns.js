/**
 * Safe PostgreSQL code patterns for eslint-plugin-pg benchmark
 * 
 * This file contains correct, secure patterns that should NOT trigger any rules.
 * Used to verify 0 false positives.
 */

const { Client, Pool } = require('pg');
const fs = require('node:fs');

// ============================================================
// Safe SQL Queries (Parameterized)
// ============================================================

// Parameterized query
async function getUserByIdSafe(userId) {
  const pool = new Pool();
  const result = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
  return result.rows[0];
}

// Named parameters
async function searchUsersSafe(name, status) {
  const client = new Client();
  const result = await client.query(
    'SELECT id, name FROM users WHERE name = $1 AND status = $2',
    [name, status]
  );
  return result.rows;
}

// ============================================================
// Safe SSL Configuration
// ============================================================

// SSL with CA certificate
const secureClient = new Client({
  ssl: {
    ca: fs.readFileSync('/path/to/server-ca.pem').toString(),
  }
});

// SSL enabled (default secure)
const sslClient = new Client({ ssl: true });

// ============================================================
// Credentials from Environment
// ============================================================

// Environment variables
const envClient = new Client({
  password: process.env.PG_PASSWORD
});

// Connection string from environment
const envPool = new Pool(process.env.DATABASE_URL);

// ============================================================
// Proper Transaction Handling
// ============================================================

// Transaction on dedicated client
async function transferFundsSafe(from, to, amount) {
  const pool = new Pool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, from]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, to]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ============================================================
// Proper Client Release
// ============================================================

// With try/finally
// Note: This demonstrates proper try/finally pattern, not optimal for single queries
async function queryWithRelease() {
  const pool = new Pool();
  // eslint-disable-next-line pg/prefer-pool-query -- Demo pattern for client release
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT 1');
    return result;
  } finally {
    client.release();
  }
}

// ============================================================
// Proper Promise Handling
// ============================================================

// Awaited query
async function logEventSafe(message) {
  const pool = new Pool();
  await pool.query('INSERT INTO logs VALUES ($1)', [message]);
}

// With .catch()
async function logEventWithCatch(message) {
  const pool = new Pool();
  pool.query('INSERT INTO logs VALUES ($1)', [message])
    .catch(err => console.error('Log failed', err));
}

// ============================================================
// Bulk Operations (No N+1)
// ============================================================

// Bulk insert with unnest
async function insertUsersBulk(users) {
  const pool = new Pool();
  await pool.query(
    'INSERT INTO users SELECT * FROM unnest($1::int[], $2::text[])',
    [users.map(u => u.id), users.map(u => u.name)]
  );
}

// Bulk update with ANY
async function updateUsersStatusBulk(userIds) {
  const pool = new Pool();
  await pool.query('UPDATE users SET active = true WHERE id = ANY($1)', [userIds]);
}

// ============================================================
// Explicit Column Selection
// ============================================================

// Explicit columns
async function getUsersWithColumns() {
  const pool = new Pool();
  return pool.query('SELECT id, name, email, created_at FROM users');
}

// COUNT(*) is acceptable
async function countUsers() {
  const pool = new Pool();
  return pool.query('SELECT COUNT(*) FROM users');
}

// ============================================================
// Safe Search Path
// ============================================================

// Static search_path
async function setSchemaSafe() {
  const client = new Client();
  await client.query('SET search_path = public, my_schema');
}

// ============================================================
// Safe COPY with STDIN
// ============================================================

// COPY FROM STDIN (client-side data)
async function loadDataSafe() {
  const client = new Client();
  await client.query('COPY users FROM STDIN WITH CSV HEADER');
}

// ============================================================
// Simple Pool Query (No Need for connect/release)
// ============================================================

// pool.query() for simple queries
async function simpleQuery() {
  const pool = new Pool();
  return pool.query('SELECT 1');
}

module.exports = {
  getUserByIdSafe,
  searchUsersSafe,
  secureClient,
  sslClient,
  envClient,
  envPool,
  transferFundsSafe,
  queryWithRelease,
  logEventSafe,
  logEventWithCatch,
  insertUsersBulk,
  updateUsersStatusBulk,
  getUsersWithColumns,
  countUsers,
  setSchemaSafe,
  loadDataSafe,
  simpleQuery,
};
