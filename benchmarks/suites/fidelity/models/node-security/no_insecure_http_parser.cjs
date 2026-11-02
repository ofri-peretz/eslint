const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-insecure-http-parser',
  domain: 21, // 7 sites x 3 values
  traces: 400,
  key: (s) => `${tag(s.site)}|${tag(s.value)}`,
  config: () => ({}),
  code: (s) => {
    const v = {
      LitTrue: 'true',
      LitFalse: 'false',
      Runtime: "process.env.LEGACY === '1'",
    }[tag(s.value)];
    const imp =
      "import http from 'node:http';\nimport https from 'node:https';\n";
    return (
      imp +
      {
        CreateServerInline: `export const server = http.createServer({ insecureHTTPParser: ${v} }, handler);`,
        RequestInline: `https.request({ host, path: '/', method: 'GET', insecureHTTPParser: ${v} }, onResponse);`,
        AgentInline: `export const agent = new http.Agent({ keepAlive: true, insecureHTTPParser: ${v} } as any);`,
        OptionsConst: `const serverOptions = { insecureHTTPParser: ${v} };\nexport const server = http.createServer(serverOptions, handler);`,
        QuotedKey: `export const server = http.createServer({ 'insecureHTTPParser': ${v} }, handler);`,
        AssignLater: `const serverOptions: http.ServerOptions = {};\nserverOptions.insecureHTTPParser = ${v};\nexport const server = http.createServer(serverOptions, handler);`,
        SubscriptAssign: `const serverOptions: http.ServerOptions = {};\nserverOptions['insecureHTTPParser'] = ${v};\nexport const server = http.createServer(serverOptions, handler);`,
      }[tag(s.site)]
    );
  },
  model: (s) => s.verdict,
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
