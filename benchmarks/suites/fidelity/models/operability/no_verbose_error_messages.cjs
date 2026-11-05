const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

// [lines before the send, the argument]
const PAYLOAD = {
  Stack: [[], 'err.stack'],
  StackSubscript: [[], "err['stack']"],
  ConstBound: [['const trace = err.stack;'], 'trace'],
  Destructured: [['const { stack } = err;'], 'stack'],
  InObject: [[], '{ error: true, stack: err.stack }'],
  QuotedKey: [[], "{ 'stack': err.stack }"],
  RenamedKey: [[], '{ trace: err.stack }'],
  Nested: [[], '{ error: { message: err.message, stack: err.stack } }'],
  Template: [[], '`Failed: ${err.stack}`'],
  Concat: [[], "'Failed: ' + err.stack"],
  Message: [[], '{ error: err.message }'],
  LiteralStackKey: [[], "{ error: 'Internal error', stack: 'hidden' }"],
  Unknown: [[], 'payload'],
  Spread: [[], '{ ...err }'],
};

const SINK = {
  Send: (a) => `res.send(${a});`,
  SendSubscript: (a) => `res['send'](${a});`,
  Json: (a) => `res.json(${a});`,
  StatusJson: (a) => `res.status(500).json(${a});`,
};

module.exports = {
  rule: 'no-verbose-error-messages',
  domain: 4 * 14,
  traces: 600,
  key: keyOf('sink', 'payload'),
  code: (s) => {
    const [pre, arg] = PAYLOAD[tag(s.payload)];
    return src(
      'interface Res { send(b: unknown): void; json(b: unknown): void; status(c: number): Res }',
      'export function onError(err: Error, res: Res, payload: unknown) {',
      pre.map((l) => `  ${l}`),
      `  ${SINK[tag(s.sink)](arg)}`,
      '}',
    );
  },
};
