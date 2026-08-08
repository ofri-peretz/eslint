/**
 * Vulnerable PostgreSQL code patterns for eslint-plugin-pg benchmark
 * 
 * This file contains intentional security vulnerabilities and anti-patterns.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */

const { Client, Pool } = require('pg');

// ============================================================
// SQL Injection Vulnerabilities
// ============================================================

// 1. Template literal injection
async function getUserByIdUnsafe(userId) {
  const client = new Client();
  const result = await client.query(`SELECT * FROM users WHERE id = ${userId}`);
  return result.rows[0];
}

// 2. String concatenation injection
async function searchUsersUnsafe(name) {
  const pool = new Pool();
  const query = "SELECT * FROM users WHERE name = '" + name + "'";
  return pool.query(query);
}

// ============================================================
// SSL/TLS Issues
// ============================================================

// 3. Disabled certificate validation
const insecureClient = new Client({
  ssl: {
    rejectUnauthorized: false
  }
});

// ============================================================
// Hardcoded Credentials
// ============================================================

// 4. Hardcoded password
const clientWithPassword = new Client({
  password: 'supersecret123'
});

// 5. Hardcoded connection string
const poolWithConnString = new Pool('postgres://admin:password123@localhost/mydb');

// ============================================================
// Transaction on Pool (Race Condition)
// ============================================================

// 6. Transaction commands on pool
async function transferFundsUnsafe(from, to, amount) {
  const pool = new Pool();
  await pool.query('BEGIN');
  await pool.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, from]);
  await pool.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, to]);
  await pool.query('COMMIT');
}

// ============================================================
// Missing Client Release
// ============================================================

// 7. Connection leak
async function queryWithoutRelease() {
  const pool = new Pool();
  const client = await pool.connect();
  await client.query('SELECT 1');
  // Missing client.release()!
}

// ============================================================
// Double Release
// ============================================================

// 8. Double release
async function doubleRelease() {
  const pool = new Pool();
  const client = await pool.connect();
  client.release();
  client.release(); // Double release!
}

// ============================================================
// Floating Query (Unhandled Promise)
// ============================================================

// 9. Unhandled query promise
async function logEvent(message) {
  const pool = new Pool();
  pool.query('INSERT INTO logs VALUES ($1)', [message]); // Not awaited!
}

// ============================================================
// N+1 Query Anti-Pattern
// ============================================================

// 10. N+1 inserts
async function insertUsersOneByOne(users) {
  const client = new Client();
  for (const user of users) {
    await client.query('INSERT INTO users VALUES ($1, $2)', [user.id, user.name]);
  }
}

// 11. forEach with mutations
async function updateUsersStatus(users) {
  const pool = new Pool();
  users.forEach(async (user) => {
    await pool.query('UPDATE users SET active = true WHERE id = $1', [user.id]);
  });
}

// ============================================================
// SELECT * Anti-Pattern
// ============================================================

// 12. SELECT * instead of explicit columns
async function getAllUsers() {
  const pool = new Pool();
  return pool.query('SELECT * FROM users');
}

// ============================================================
// Unsafe Search Path
// ============================================================

// 13. Dynamic search_path
async function setSchemaUnsafe(userSchema) {
  const client = new Client();
  await client.query(`SET search_path TO ${userSchema}`);
}

// ============================================================
// Unsafe COPY FROM
// ============================================================

// 14. COPY FROM with dynamic path
async function loadDataUnsafe(filePath) {
  const client = new Client();
  await client.query(`COPY users FROM '${filePath}'`);
}

// ============================================================
// Parameter Count Mismatch
// ============================================================

// 15. Missing parameter
async function queryWithMissingParam(userId, status) {
  const pool = new Pool();
  return pool.query('SELECT * FROM users WHERE id = $1 AND status = $2', [userId]);
}

module.exports = {
  getUserByIdUnsafe,
  searchUsersUnsafe,
  insecureClient,
  clientWithPassword,
  poolWithConnString,
  transferFundsUnsafe,
  queryWithoutRelease,
  doubleRelease,
  logEvent,
  insertUsersOneByOne,
  updateUsersStatus,
  getAllUsers,
  setSchemaUnsafe,
  loadDataUnsafe,
  queryWithMissingParam,
};
