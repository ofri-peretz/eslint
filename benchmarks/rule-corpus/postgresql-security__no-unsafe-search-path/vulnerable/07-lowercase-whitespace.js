// Adversarial: lowercase keywords, irregular whitespace and a leading SQL
// comment. None of that changes what the server does with the statement.
const { Client } = require('pg');

const client = new Client();

async function activateSchema(schema) {
  await client.query(`
    -- switch the resolution order for this session
    set   local   search_path  to  ${schema}
  `);
}

module.exports = { activateSchema };
