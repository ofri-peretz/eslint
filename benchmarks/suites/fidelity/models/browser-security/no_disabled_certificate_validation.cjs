const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 42, // 14 patterns x 3 import styles
  traces: 700,
  rule: 'no-disabled-certificate-validation',
  key: (s) => `${tag(s.pattern)}|${tag(s.imp)}`,
  config: () => undefined,
  code: (s) => {
    const imp = {
      NoImport: 'declare const https: any;\ndeclare const tls: any;',
      RequireHttps:
        "const https = require('https');\nconst tls = require('tls');",
      ImportNodeHttps:
        "import https from 'node:https';\nimport tls from 'node:tls';",
    }[tag(s.imp)];
    const stmt = {
      AgentRejectFalse:
        'const agent = new https.Agent({ rejectUnauthorized: false });',
      AgentRejectTrue:
        'const agent = new https.Agent({ rejectUnauthorized: true });',
      AgentRejectFalseStrKey:
        "const agent = new https.Agent({ 'rejectUnauthorized': false });",
      AgentCaTrue:
        "const agent = new https.Agent({ ca: fs.readFileSync('private-ca.crt'), rejectUnauthorized: true });",
      AxiosAgentFalse:
        "axios.get('https://api.example.com', { httpsAgent: new https.Agent({ rejectUnauthorized: false }) });",
      TlsConnectFalse:
        "const socket = tls.connect({ host: 'db.example.com', port: 5432, rejectUnauthorized: false });",
      RequestStrictSslFalse:
        "request({ url: 'https://api.example.com', strictSSL: false });",
      RequestStrictSslTrue:
        "request({ url: 'https://api.example.com', strictSSL: true });",
      CheckServerIdentityNoop:
        'const agent = new https.Agent({ checkServerIdentity: () => undefined });',
      EnvTls0: "process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';",
      EnvTls1: "process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';",
      EnvBracket0: "process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';",
      EnvNumber0: 'process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;',
      EnvCastAny0: "(process.env as any).NODE_TLS_REJECT_UNAUTHORIZED = '0';",
    }[tag(s.pattern)];
    return `${imp}\ndeclare const axios: any;\ndeclare const request: any;\ndeclare const fs: any;\n${stmt}\n`;
  },
  model: (s) => s.verdict,
};
