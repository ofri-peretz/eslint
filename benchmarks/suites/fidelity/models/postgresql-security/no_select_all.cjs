const { tag } = require('../../lib.cjs');
const { program } = require('../../postgresql.cjs');

/** sql shape -> the query call's arguments. */
const SQL = {
  Star: "'SELECT * FROM users WHERE id = $1', [id]",
  Lowercase: "'select * from users where id = $1', [id]",
  TemplateStar: '`SELECT *\n  FROM users\n  WHERE id = $1`, [id]',
  Mixed: "'SELECT id, email, * FROM users WHERE id = $1', [id]",
  AliasStar:
    "'SELECT u.* FROM users u JOIN orgs o ON o.id = u.org_id WHERE u.id = $1', [id]",
  ConfigStar: "{ text: 'SELECT * FROM users WHERE id = $1', values: [id] }",
  Columns: "'SELECT id, email, name FROM users WHERE id = $1', [id]",
  CountStar: "'SELECT COUNT(*) FROM users WHERE org_id = $1', [id]",
  Multiply:
    "'SELECT id, price * qty AS total FROM order_lines WHERE order_id = $1', [id]",
  CteStar:
    "'WITH recent AS (SELECT id, total FROM orders WHERE user_id = $1) SELECT * FROM recent', [id]",
  DerivedStar:
    "'SELECT * FROM (SELECT id, email FROM users WHERE org_id = $1) AS u', [id]",
};

function code(s) {
  const d = tag(s.driver);
  const ctor = d === 'SinkBracket' ? 'Named' : d;
  const handle = d === 'Client' ? 'client' : 'pool';
  const sink = d === 'SinkBracket' ? `${handle}['query']` : `${handle}.query`;
  return program(ctor, `return ${sink}(${SQL[tag(s.sql)]});`, { handle });
}

module.exports = {
  rule: 'no-select-all',
  domain: 9 * 11,
  traces: 700,
  key: (s) => `${tag(s.driver)}|${tag(s.sql)}`,
  code,
};
