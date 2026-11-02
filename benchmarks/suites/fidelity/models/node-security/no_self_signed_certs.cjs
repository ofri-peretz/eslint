const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-self-signed-certs',
  domain: 22, // 11 sinks x disabled/enabled
  traces: 400,
  key: (s) => `${tag(s.sink)}|disabled=${s.disabled}`,
  config: () => ({}),
  code: (s) => {
    const b = s.disabled ? 'false' : 'true';
    const env = s.disabled ? '0' : '1';
    const imp =
      "import https from 'node:https';\nimport tls from 'node:tls';\n";
    return (
      imp +
      {
        RequestOption: `https.request({ hostname: 'api.example.com', rejectUnauthorized: ${b} });`,
        AgentOption: `export const agent = new https.Agent({ rejectUnauthorized: ${b} });`,
        TlsConnect: `tls.connect({ host: 'db.internal', port: 5432, rejectUnauthorized: ${b} });`,
        QuotedKey: `https.request({ hostname: 'api.example.com', 'rejectUnauthorized': ${b} });`,
        AfterSpread: `https.request({ ...baseOptions, rejectUnauthorized: ${b} });`,
        ConstValue: `const verifyPeer = ${b};\nexport const agent = new https.Agent({ rejectUnauthorized: verifyPeer });`,
        EnvDot: `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '${env}';`,
        EnvSubscript: `process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '${env}';`,
        EnvGlobalThis: `globalThis.process.env.NODE_TLS_REJECT_UNAUTHORIZED = '${env}';`,
        EnvNumber: `process.env.NODE_TLS_REJECT_UNAUTHORIZED = ${env} as any;`,
        EnvTemplate: `process.env.NODE_TLS_REJECT_UNAUTHORIZED = \`${env}\`;`,
      }[tag(s.sink)]
    );
  },
  model: (s) => s.verdict,
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
