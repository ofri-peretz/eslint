const { tag } = require('../../lib.cjs');
const { program } = require('../../postgresql.cjs');

const ARGS = "'INSERT INTO audit_log (actor) VALUES ($1)', [id]";

/** use -> handler body, given the sink callee. */
const USES = {
  Floating: (q) => `${q}(${ARGS});\nres.sendStatus(204);`,
  FloatingThen: (q) =>
    `${q}(${ARGS}).then(() => console.log('logged'));\nres.sendStatus(204);`,
  Awaited: (q) => `await ${q}(${ARGS});\nres.sendStatus(204);`,
  Caught: (q) =>
    `${q}(${ARGS}).catch((err: Error) => console.error('audit failed', err));\nres.sendStatus(204);`,
  ThenWithReject: (q) =>
    `${q}(${ARGS}).then(\n  () => res.sendStatus(204),\n  (err: Error) => res.status(500).send(err.message),\n);`,
  Assigned: (q) =>
    `const pending = ${q}(${ARGS});\nawait pending;\nres.sendStatus(204);`,
  Returned: (q) => `return ${q}(${ARGS});`,
  PromiseAll: (q) =>
    `await Promise.all([${q}(${ARGS}), ${q}('UPDATE users SET seen_at = now() WHERE id = $1', [id])]);\nres.sendStatus(204);`,
  Callback: (q) =>
    `${q}(${ARGS}, (err: Error) => {\n  if (err) return res.status(500).end();\n  res.sendStatus(204);\n});`,
  VoidOptOut: (q) => `void ${q}(${ARGS});\nres.sendStatus(204);`,
  Supertest: () =>
    "request(req.app).get('/users').query({ page: 2 }).end(() => res.sendStatus(204));",
};

function code(s) {
  const d = tag(s.driver);
  const use = tag(s.use);
  const ctor = d === 'SinkBracket' ? 'Named' : d;
  const handle = d === 'Client' ? 'client' : 'pool';
  const sink = d === 'SinkBracket' ? `${handle}['query']` : `${handle}.query`;
  const imports = use === 'Supertest' ? "import request from 'supertest';" : '';
  return program(ctor, USES[use](sink), { handle, imports });
}

module.exports = {
  rule: 'no-floating-query',
  domain: 9 * 11,
  traces: 700,
  key: (s) => `${tag(s.driver)}|${tag(s.use)}`,
  code,
};
