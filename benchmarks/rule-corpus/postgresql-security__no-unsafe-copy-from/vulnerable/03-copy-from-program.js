// COPY … FROM PROGRAM runs a shell command on the database host. With a
// dynamic argument this is remote code execution, not merely a file read.
const { Pool } = require('pg');

const pool = new Pool();

async function ingestCompressed(archive) {
  await pool.query(`COPY logs FROM PROGRAM 'gzip -dc ${archive}' WITH (FORMAT csv)`);
}

module.exports = { ingestCompressed };
