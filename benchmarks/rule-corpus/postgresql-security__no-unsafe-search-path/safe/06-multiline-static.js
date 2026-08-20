// A multi-line template with no interpolation at all — the shape every
// migration file uses for readability.
const { Client } = require('pg');

const client = new Client();

async function bootstrap() {
  await client.query(`
    SET search_path TO app, public;
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS app.migrations (id serial primary key)
  `);
}

module.exports = { bootstrap };
