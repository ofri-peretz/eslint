/**
 * VULNERABLE (CWE-1049) - A worker draining a queue one statement at a time on
 * a checked-out client.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function drain(queue) {
  const client = await pool.connect();
  try {
    while (queue.length > 0) {
      const job = queue.shift();
      await client.query('INSERT INTO job_log (job_id, payload) VALUES ($1, $2)', [job.id, job.payload]);
    }
  } finally {
    client.release();
  }
}

module.exports = { drain };
