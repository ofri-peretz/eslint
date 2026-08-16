// Wave 2. The SET is the second statement in a multi-statement string, so it
// does not start the text it is written in.
const { Client } = require('pg');

const client = new Client();

async function enter(schema) {
  await client.query(`BEGIN; SET search_path TO ${schema}; SELECT 1;`);
}

module.exports = { enter };
