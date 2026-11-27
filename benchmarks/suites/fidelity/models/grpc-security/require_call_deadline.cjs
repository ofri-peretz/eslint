const { tag } = require('../../lib.cjs');

/** client -> { pre?: lines, creds }. */
const CLIENT = {
  SslInline: { creds: 'grpc.credentials.createSsl()' },
  InsecureConst: {
    pre: 'const creds = grpc.credentials.createInsecure();',
    creds: 'creds',
  },
  Composed: {
    creds: 'grpc.credentials.combineChannelCredentials(ssl, perCall)',
  },
  UnknownCreds: { creds: 'channelCreds' },
};

const ARGS = {
  ReqCallback: '{ id: 1 }, (err, res) => {}',
  UnknownReqCallback: 'request, (err, res) => {}',
  ReqOptsDeadline: '{ id: 1 }, { deadline: Date.now() + 5000 }, () => {}',
  ReqMdOptsDeadline:
    '{ id: 1 }, new grpc.Metadata(), { deadline: soon }, () => {}',
  ReqOptsNoDeadline: '{ id: 1 }, { waitForReady: true }, () => {}',
  ReqUnknownCb: '{ id: 1 }, cb',
  LoneUnknown: 'opts',
  NoArgs: '',
  ReqSpreadOpts: '{ id: 1 }, { ...base }, () => {}',
};

function code(s) {
  const client = CLIENT[tag(s.client)];
  const call =
    tag(s.method) === 'Rpc'
      ? `client.GetOrder(${ARGS[tag(s.args)]});`
      : 'client.close();';
  return [
    client.pre,
    `const client = new pkg.Orders(target, ${client.creds});`,
    call,
  ]
    .filter(Boolean)
    .join('\n');
}

module.exports = {
  rule: 'require-call-deadline',
  domain: 4 * 9 * 2, // clients x argument shapes x methods
  traces: 1200,
  key: (s) => `${tag(s.client)}|${tag(s.args)}|${tag(s.method)}`,
  code,
};
