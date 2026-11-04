const { tag, withTestFile } = require('../../lib.cjs');
const { lambdaProgram } = require('../../lambda.cjs');

// `e` is the caught error's name (absent for an unbound catch).
const BODY = {
  Empty: () => [],
  EmptyIntentional: () => ['// intentional: cleanup errors are non-critical'],
  EmptyTodo: () => ['// TODO'],
  ConsoleError: (e) => [`console.error('Process failed', ${e ?? 'event'});`],
  PowertoolsError: (e) => [
    `logger.error('Operation failed', { error: ${e ?? 'undefined'} });`,
  ],
  Rethrow: (e) => [e ? `throw ${e};` : "throw new Error('failed');"],
  WrapThrow: (e) => [
    `throw new Error('Order processing failed', { cause: ${e ?? 'undefined'} });`,
  ],
  ReturnSuccess: () => ['return { statusCode: 200 };'],
  ReturnServerError: () => [
    "return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };",
  ],
  ReturnNull: () => ['return null;'],
  BareReturn: () => ['return;'],
  ReturnTrue: () => ['return true;'],
  CallbackError: (e) => [`return callback(${e ?? "new Error('failed')"});`],
  CallbackSuccess: () => ['return callback(null, { statusCode: 200 });'],
  LogInCallback: (e) => [
    `setImmediate(() => console.error('Process failed', ${e ?? 'event'}));`,
  ],
};
const BINDING = { Named: 'error', Short: 'e', Unbound: undefined };

const base = {
  rule: 'no-error-swallowing',
  // Bodies 15 x allowWithComment on/off; Bindings 3 x 2 bodies; Gates 9 x 2 bodies.
  domain: 30 + 6 + 18,
  traces: 1000,
  key: (s) =>
    ['focus', 'body', 'binding', 'commentOff', 'gate']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => (s.commentOff ? { allowWithComment: false } : undefined),
  code: (s) => {
    const e = BINDING[tag(s.binding)];
    const body = tag(s.body);
    const gate = tag(s.gate);
    const handlerGate = !gate.startsWith('Sdk') && gate !== 'NoEvidence';
    return lambdaProgram(
      gate,
      [
        'try {',
        '  await processEvent(event);',
        `} catch${e ? ` (${e})` : ''} {`,
        ...BODY[body](e).map((l) => `  ${l}`),
        '}',
        "return { statusCode: 200, body: 'ok' };",
      ],
      {
        imports: ["import { processEvent } from './orders';"],
        pre: body.startsWith('Powertools')
          ? [
              "import { Logger } from '@aws-lambda-powertools/logger';",
              'const logger = new Logger();',
            ]
          : [],
        params:
          handlerGate && body.startsWith('Callback')
            ? 'event, context, callback'
            : 'event, context',
      },
    );
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
