// The values come back from .map(). Its length depends on runtime data.
const { Client } = require('pg');

const client = new Client();

async function bulkTouch(rows) {
  return client.query(
    'UPDATE devices SET seen_at = now() WHERE id = ANY($1)',
    rows.map((r) => r.id),
  );
}

module.exports = { bulkTouch };
