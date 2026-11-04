const { tag } = require('../../lib.cjs');
const { program } = require('../../postgresql.cjs');

/** copy shape -> the query call's arguments. */
const COPY = {
  FromReq: "`COPY users FROM '${req.body.filepath}' WITH (FORMAT csv)`",
  FromConcat: "'COPY users FROM ' + req.body.filepath",
  FromUnderPrefix: "`COPY users FROM '/var/imports/${req.query.file}' CSV`",
  FromProgram: "`COPY users FROM PROGRAM '${req.body.cmd}'`",
  ToDynamic: "`COPY users TO '/exports/${req.query.name}.csv' CSV`",
  FromFixed: '"COPY users FROM \'/var/imports/users.csv\' WITH (FORMAT csv)"',
  FromStdin: "'COPY users (id, name) FROM STDIN WITH (FORMAT csv, HEADER)'",
  ToStdout: "'COPY users TO STDOUT WITH CSV'",
  ToFixed: '"COPY users TO \'/exports/users.csv\' CSV"',
  NotCopy: "'SELECT id, name FROM users WHERE id = $1', [req.params.id]",
};

const OPTS = {
  Defaults: undefined,
  AllowHardcoded: { allowHardcodedPaths: true },
  AllowedMatch: { allowedPaths: ['^/var/imports/'] },
  AllowedOther: { allowedPaths: ['^/srv/seed/', '\\.json$'] },
};

function code(s) {
  const d = tag(s.driver);
  const ctor = d === 'SinkBracket' ? 'Named' : d;
  const handle = d === 'Client' ? 'client' : 'pool';
  const sink = d === 'SinkBracket' ? `${handle}['query']` : `${handle}.query`;
  return program(ctor, `return ${sink}(${COPY[tag(s.copy)]});`, { handle });
}

module.exports = {
  rule: 'no-unsafe-copy-from',
  domain: 9 * 10 * 4,
  traces: 3000,
  key: (s) => `${tag(s.driver)}|${tag(s.copy)}|${tag(s.opt)}`,
  config: (s) => OPTS[tag(s.opt)],
  code,
};
