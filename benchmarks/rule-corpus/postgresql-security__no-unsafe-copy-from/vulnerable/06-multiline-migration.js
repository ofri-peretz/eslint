// A seed script with a hardcoded server-side path, written across several
// lines the way every migration file is. The path is constant, so this is the
// medium-severity server-side-file-access finding rather than an injection —
// but it is still the database reading a file the application never saw.
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function seed() {
  await client.connect();
  await client.query(`
    COPY seed_users (id, email, created_at)
    FROM '/var/lib/postgresql/seed/users.csv'
    WITH (FORMAT csv, HEADER true)
  `);
}

module.exports = { seed };
