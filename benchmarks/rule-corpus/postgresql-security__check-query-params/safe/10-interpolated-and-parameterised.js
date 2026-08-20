// Adversarial: a template with a real interpolation (a validated sort column)
// alongside real placeholders. The interpolation does not hide the count.
const { Client } = require('pg');

const client = new Client();
const SORT_COLUMNS = { recent: 'created_at', name: 'display_name' };

async function page(orgId, cursor, sortKey) {
  const column = SORT_COLUMNS[sortKey] ?? 'created_at';
  return client.query(
    `SELECT id, display_name FROM users WHERE org_id = $1 AND created_at < $2 ORDER BY ${column} DESC LIMIT 50`,
    [orgId, cursor],
  );
}

module.exports = { page };
