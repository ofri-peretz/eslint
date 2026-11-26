const { tag } = require('../../lib.cjs');

/** shape -> the details expression over the error binding `e`. */
const SHAPE = {
  Stack: 'e.stack',
  Message: 'e.message',
  StringWrap: 'String(e)',
  Template: '`failed: ${e.message}`',
  Concat: "'failed: ' + e.toString()",
  Itself: 'e',
  Code: 'e.code',
  Literal: "'internal error'",
};

/** sink -> (status expression) => the statement that sends it. */
const SINK = {
  Callback: (st) => `cb(${st});`,
  Emit: (st) => `call.emit('error', ${st});`,
  Destroy: (st) => `call.destroy(${st});`,
  OtherFn: (st) => `report(${st});`,
  EmitData: (st) => `call.emit('data', ${st});`,
  NotHandler: (st) => `cb(${st});`,
};

/** source -> (statements using `e`) => code that binds `e` and runs them. */
const SOURCE = {
  CatchParam: (inner) => `try { work(); } catch (e) { ${inner} }`,
  PromiseCatch: (inner) => `load().catch((e) => { ${inner} });`,
  NewError: (inner) => `{ const e = new Error('x'); ${inner} }`,
  LoopParam: (inner) => `items.forEach((e) => { ${inner} });`,
};

function code(s) {
  const status = `{ code: 13, details: ${SHAPE[tag(s.shape)]} }`;
  const send = SINK[tag(s.sink)];
  const inner =
    tag(s.via) === 'ConstObj'
      ? `const st = ${status}; ${send('st')}`
      : send(status);
  const register =
    tag(s.sink) === 'NotHandler' ? 'router.register' : 'server.addService';
  return [
    `${register}(svc, {`,
    '  Get(call, cb) {',
    `    ${SOURCE[tag(s.source)](inner)}`,
    '  },',
    '});',
  ].join('\n');
}

module.exports = {
  rule: 'no-error-detail-leak',
  domain: 4 * 8 * 6 * 2, // sources x shapes x sinks x vias
  traces: 3000,
  key: (s) => `${tag(s.source)}|${tag(s.shape)}|${tag(s.sink)}|${tag(s.via)}`,
  code,
};
