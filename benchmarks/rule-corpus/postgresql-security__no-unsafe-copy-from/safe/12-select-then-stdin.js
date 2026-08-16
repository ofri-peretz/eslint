// Wave 2. Two statements in one string, the first a SELECT and the second a
// STDIN copy. Finding a COPY segment must not stop at the first segment.
const { Client } = require('pg');

const client = new Client();

async function prepare() {
  await client.query(`
    SELECT set_config('client_encoding', 'UTF8', false);
    COPY staging FROM STDIN WITH (FORMAT csv);
  `);
}

module.exports = { prepare };
