// A dynamic SET, but not of search_path. Timezone and statement_timeout are
// session knobs with no bearing on how names resolve.
const { Client } = require('pg');

const client = new Client();

async function applySessionPrefs(timezone, timeoutMs) {
  await client.query(`SET TIME ZONE '${timezone}'`);
  await client.query(`SET statement_timeout = ${timeoutMs}`);
}

module.exports = { applySessionPrefs };
