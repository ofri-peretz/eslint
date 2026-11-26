const { tag } = require('../../lib.cjs');

/** creds -> { pre?: module-level lines, expr }. */
const CREDS = {
  Insecure: { expr: 'grpc.ServerCredentials.createInsecure()' },
  InsecureConst: {
    pre: 'const creds = grpc.ServerCredentials.createInsecure();',
    expr: 'creds',
  },
  InsecureImported: {
    pre: "import { ServerCredentials } from '@grpc/grpc-js';",
    expr: 'ServerCredentials.createInsecure()',
  },
  Ssl: { expr: 'grpc.ServerCredentials.createSsl(ca, pairs)' },
  Unknown: { expr: 'creds' },
  ChannelInsecure: { expr: 'grpc.credentials.createInsecure()' },
};

const ADDRESS = {
  Any4: "'0.0.0.0:50051'",
  Any6: "'[::]:50051'",
  BarePort: '`:${PORT}`',
  Any4EnvPort: '`0.0.0.0:${process.env.PORT}`',
  Any4Concat: "'0.0.0.0:' + PORT",
  Loopback4: "'127.0.0.1:50051'",
  Loopback6: "'[::1]:50051'",
  Unix: "'unix:///run/svc.sock'",
  Named: "'api.internal:50051'",
  EnvHost: '`${process.env.HOST}:50051`',
  Config: 'config.address',
};

function code(s) {
  const creds = CREDS[tag(s.creds)];
  const call =
    tag(s.method) === 'BindAsync'
      ? `server.bindAsync(${ADDRESS[tag(s.address)]}, ${creds.expr}, () => {});`
      : `server.bind(${ADDRESS[tag(s.address)]}, ${creds.expr});`;
  return [creds.pre, call].filter(Boolean).join('\n');
}

module.exports = {
  rule: 'no-insecure-server-credentials',
  domain: 6 * 11 * 2, // credentials x addresses x methods
  traces: 1500,
  key: (s) => `${tag(s.creds)}|${tag(s.address)}|${tag(s.method)}`,
  code,
};
