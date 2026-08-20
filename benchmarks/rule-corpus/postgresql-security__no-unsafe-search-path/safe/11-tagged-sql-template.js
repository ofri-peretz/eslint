// Wave 2. postgres.js binds every interpolation in a tagged `sql` template as
// a parameter. Unwrapping tagged templates indiscriminately would report the
// safest client in the ecosystem, so only String.raw is unwrapped.
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL);

async function rows(schema) {
  return sql`SELECT * FROM pg_tables WHERE schemaname = ${schema}`;
}

module.exports = { rows };
