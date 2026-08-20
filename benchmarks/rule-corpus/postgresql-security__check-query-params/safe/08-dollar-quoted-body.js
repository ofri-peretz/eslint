// Adversarial: a dollar-quoted function body. `$1` inside `$$ … $$` is part of
// a string constant, and `$$` is not a placeholder either.
const { Client } = require('pg');

const client = new Client();

async function installTrigger() {
  await client.query(
    `
      CREATE OR REPLACE FUNCTION bump_version() RETURNS trigger AS $$
      BEGIN
        NEW.version := OLD.version + 1;  -- not $1, not $2
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `,
    [],
  );
}

module.exports = { installTrigger };
