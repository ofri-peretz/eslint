const { tag } = require('../../lib.cjs');
const { program, PG_DRIVERS } = require('../../postgresql.cjs');

const SCHEMA = 'const schema = req.query.tenant as string;';

/**
 * path shape -> { imports?, pre?: module-level statements, body(sink, make) }.
 * `make` builds a connection with the driver's own constructor.
 */
const PATHS = {
  TemplateReq: {
    body: (q) => `await ${q}(\`SET search_path TO \${req.query.tenant}\`);`,
  },
  TemplateParam: {
    body: (q) => `${SCHEMA}\nawait ${q}(\`SET search_path = \${schema}\`);`,
  },
  Concat: {
    body: (q) => `await ${q}('SET search_path = ' + req.body.schema);`,
  },
  SetLocal: {
    body: (q) =>
      `${SCHEMA}\nawait ${q}(\`SET LOCAL search_path TO \${schema}, public\`);`,
  },
  FormatIdent: {
    imports: "import format from 'pg-format';",
    body: (q) =>
      `await ${q}(format('SET search_path = %I', req.query.tenant));`,
  },
  EscapedIdent: {
    imports: "import format from 'pg-format';",
    body: (q) =>
      `await ${q}(\`SET search_path TO \${format.ident(req.query.tenant)}\`);`,
  },
  SetConfigBound: {
    body: (q) =>
      `await ${q}("SELECT set_config('search_path', $1, false)", [req.query.tenant]);`,
  },
  OptionsDynamic: {
    body: (q, make) =>
      `${SCHEMA}\nconst tenantDb = ${make(`{ connectionString: process.env.DATABASE_URL, options: \`-c search_path=\${schema}\` }`)};\nreturn tenantDb;`,
  },
  Guarded: {
    pre: "const ALLOWED_SCHEMAS = new Set(['tenant_a', 'tenant_b']);",
    body: (q) =>
      `${SCHEMA}\nif (!ALLOWED_SCHEMAS.has(schema)) throw new Error('unknown tenant');\nawait ${q}(\`SET search_path TO \${schema}\`);`,
  },
  AssertsHelper: {
    pre: [
      "const ALLOWED_SCHEMAS = ['tenant_a', 'tenant_b'] as const;",
      'function assertSchema(s: string): asserts s is (typeof ALLOWED_SCHEMAS)[number] {',
      "  if (!(ALLOWED_SCHEMAS as readonly string[]).includes(s)) throw new Error('unknown tenant');",
      '}',
    ].join('\n'),
    body: (q) =>
      `${SCHEMA}\nassertSchema(schema);\nawait ${q}(\`SET search_path TO \${schema}\`);`,
  },
  ConstSchema: {
    pre: "const APP_SCHEMA = 'app';",
    body: (q) => `await ${q}(\`SET search_path TO \${APP_SCHEMA}, public\`);`,
  },
  Literal: { body: (q) => `await ${q}('SET search_path TO app, public');` },
  SetConfigConst: {
    body: (q) =>
      `await ${q}("SELECT set_config('search_path', $1, false)", ['app']);`,
  },
  OptionsConst: {
    body: (q, make) =>
      `const appDb = ${make("{ connectionString: process.env.DATABASE_URL, options: '-c search_path=app' }")};\nreturn appDb;`,
  },
};

function code(s) {
  const d = tag(s.driver);
  const p = PATHS[tag(s.path)];
  const ctor = d === 'SinkBracket' ? 'Named' : d;
  const handle = d === 'Client' ? 'client' : 'pool';
  const sink = d === 'SinkBracket' ? `${handle}['query']` : `${handle}.query`;
  return program(ctor, p.body(sink, PG_DRIVERS[ctor].make), {
    handle,
    imports: p.imports,
    pre: p.pre,
  });
}

module.exports = {
  rule: 'no-unsafe-search-path',
  domain: 9 * 14 - 2,
  traces: 900,
  key: (s) => `${tag(s.driver)}|${tag(s.path)}`,
  code,
};
