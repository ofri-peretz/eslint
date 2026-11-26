const { tag } = require('../../lib.cjs');

const KEY = {
  Recv: 'grpc.max_receive_message_length',
  Send: 'grpc.max_send_message_length',
  Other: 'grpc.keepalive_time_ms',
};

/** value -> { pre?: module-level lines, expr }. */
const VALUE = {
  MinusOne: { expr: '-1' },
  Gig: { expr: '1024 * 1024 * 1024' },
  ConstGig: {
    pre: 'const MB = 1024 * 1024;\nconst MAX = 1024 * MB;',
    expr: 'MAX',
  },
  Inf: { expr: 'Infinity' },
  Shift30: { expr: '1 << 30' },
  Exactly100: { expr: '100 * 1024 * 1024' },
  Mb16: { expr: '16 * 1024 * 1024' },
  Config: { expr: 'config.maxBytes' },
  Bitwise: { expr: '4096 | 0' },
};

const PLACE = {
  ServerOpts: (k, v) => `new grpc.Server({ '${k}': ${v} });`,
  ClientOpts: (k, v) => `new pkg.Svc(target, creds, { '${k}': ${v} });`,
  Assign: (k, v) => `const options = {};\noptions['${k}'] = ${v};`,
  ComputedKey: (k, v) => `new grpc.Server({ ['${k}']: ${v} });`,
};

function code(s) {
  const value = VALUE[tag(s.value)];
  return [value.pre, PLACE[tag(s.place)](KEY[tag(s.key)], value.expr)]
    .filter(Boolean)
    .join('\n');
}

module.exports = {
  rule: 'no-unbounded-message-size',
  domain: 3 * 4 * 9, // keys x places x values
  traces: 1200,
  key: (s) => `${tag(s.key)}|${tag(s.place)}|${tag(s.value)}`,
  code,
};
