const { tag } = require('../../lib.cjs');

const POLICIES = {
  ScriptUI: "script-src 'unsafe-inline'",
  StyleUI: "default-src 'self'; style-src 'unsafe-inline'",
  Nonce: "script-src 'self' 'nonce-abc123'",
  Hash: "script-src 'self' 'sha256-abc123'",
  Self: "default-src 'self'",
  Upper: "script-src 'UNSAFE-INLINE'",
  Prose: "Never add 'unsafe-inline' to your policy",
  UnsafeHashes: "script-src 'unsafe-hashes' 'sha256-abc123'",
};

let filename = 'src/app.ts';

module.exports = {
  domain: 120,
  traces: 1300,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-unsafe-inline-csp',
  get filename() {
    return filename;
  },
  key: (s) => `${tag(s.context)}|${tag(s.policy)}|${tag(s.ctx)}`,
  config: (s) =>
    tag(s.ctx) === 'TestFlipped' ? { allowInTests: false } : undefined,
  code: (s) => {
    filename = tag(s.ctx) === 'Prod' ? 'src/app.ts' : 'src/app.test.ts';
    const p = POLICIES[tag(s.policy)];
    const stmt = {
      ConstLit: `export const csp = "${p}";`,
      Template: `export const csp = \`${p}\`;`,
      TemplateExpr: `export const csp = \`${p}; report-uri \${endpoint}\`;`,
      SetHeader: `res.setHeader('Content-Security-Policy', "${p}");`,
      MetaObject: `export const meta = { content: "${p}" };`,
    }[tag(s.context)];
    return [
      'declare const endpoint: string;',
      'declare const res: { setHeader(n: string, v: string): void };',
      stmt,
    ].join('\n');
  },
  model: (s) => s.verdict,
};
