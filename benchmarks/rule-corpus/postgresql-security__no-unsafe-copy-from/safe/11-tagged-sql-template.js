// Wave 2. A tagged template from postgres.js. The tag is not String.raw, so
// the statement is not read out of it and the parameterising client is left
// alone.
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL);

async function importFrom(source) {
  return sql`SELECT import_from(${source})`;
}

module.exports = { importFrom };
