const { tag } = require('../../lib.cjs');

/** creds -> { pre?: lines, expr }. */
const CREDS = {
  Insecure: { expr: 'grpc.credentials.createInsecure()' },
  InsecureConst: {
    pre: 'const creds = grpc.credentials.createInsecure();',
    expr: 'creds',
  },
  InsecureImported: {
    pre: "import { credentials } from '@grpc/grpc-js';",
    expr: 'credentials.createInsecure()',
  },
  Ssl: { expr: 'grpc.credentials.createSsl()' },
  Unknown: { expr: 'channelCreds' },
};

/** header -> [name expression, value expression]. */
const HEADER = {
  Authorization: ["'Authorization'", 'token'],
  Cookie: ["'cookie'", 'session'],
  ApiKey: ["'x-api-key'", 'key'],
  BearerValue: ["'x-token'", '`Bearer ${t}`'],
  RequestId: ["'x-request-id'", 'rid'],
  Computed: ['name', 'token'],
};

function code(s) {
  const creds = CREDS[tag(s.creds)];
  const [name, value] = HEADER[tag(s.header)];
  const setter = tag(s.setter) === 'Add' ? 'add' : 'set';
  const send = tag(s.send);
  const ctor = send === 'NotMetadata' ? 'new Map()' : 'new grpc.Metadata()';
  const lines = [
    creds.pre,
    `const client = new pkg.Accounts(target, ${creds.expr});`,
    'const other = new pkg.Accounts(target, secure);',
    `const md = ${ctor};`,
    `md.${setter}(${name}, ${value});`,
  ];
  if (send === 'SameClient' || send === 'NotMetadata') {
    lines.push('client.GetAccount({ id }, md, cb);');
  } else if (send === 'OtherClient') {
    lines.push('other.GetAccount({ id }, md, cb);');
  } else {
    lines.push('client.GetAccount({ id }, cb);');
  }
  return lines.filter(Boolean).join('\n');
}

module.exports = {
  rule: 'no-insecure-channel-credentials',
  domain: 5 * 6 * 4 * 2, // credentials x headers x sends x setters
  traces: 2400,
  key: (s) =>
    `${tag(s.creds)}|${tag(s.header)}|${tag(s.send)}|${tag(s.setter)}`,
  code,
};
