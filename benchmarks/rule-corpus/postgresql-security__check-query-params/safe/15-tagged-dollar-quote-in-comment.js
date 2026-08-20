// Wave 2. A named dollar-quote tag around a body that mentions $1, plus a
// block comment holding a higher index than any real placeholder.
const { Client } = require('pg');

const client = new Client();

async function install() {
  await client.query(
    `
      /* was: WHERE tenant = $9 */
      CREATE OR REPLACE FUNCTION greet(name text) RETURNS text AS $body$
        SELECT 'hello ' || name || ' $1 $2 $3';
      $body$ LANGUAGE sql;
      SELECT greet($1);
    `,
    ['world'],
  );
}

module.exports = { install };
