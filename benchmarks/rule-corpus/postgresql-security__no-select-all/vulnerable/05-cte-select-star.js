/**
 * VULNERABLE (CWE-1049) - The star lives inside a CTE. The CTE is materialised
 * with every column of `events`, so the cost and the schema coupling are
 * identical to a top-level star.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function eventDigest(since) {
  const { rows } = await pool.query(
    `WITH recent AS (
       SELECT * FROM events WHERE occurred_at > $1
     )
     SELECT kind, count(*) AS n FROM recent GROUP BY kind`,
    [since],
  );
  return rows;
}

module.exports = { eventDigest };
