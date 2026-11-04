const { tag, withTestFile } = require('../../lib.cjs');
const { lambdaProgram } = require('../../lambda.cjs');

const ARG = {
  Direct: 'process.env',
  Stringify: 'JSON.stringify(process.env)',
  StringifyIndent: 'JSON.stringify(process.env, null, 2)',
  Structured: '{ env: process.env, requestId: context.awsRequestId }',
  Spread: '{ ...process.env }',
  Entries: 'Object.entries(process.env)',
  Bracket: "process['env']",
  Template: '`Starting with env: ${process.env}`',
  Concat: "'env: ' + process.env",
  SpecificVar: 'process.env.AWS_REGION',
  SafeSubset:
    '{ region: process.env.AWS_REGION, version: process.env.APP_VERSION }',
  TemplateVar: '`region: ${process.env.AWS_REGION}`',
  BracketVar: "process.env['AWS_REGION']",
  KeysOnly: 'Object.keys(process.env)',
};
const POWERTOOLS = [
  "import { Logger } from '@aws-lambda-powertools/logger';",
  "const logger = new Logger({ serviceName: 'orders' });",
];
const SINK = {
  ConsoleLog: (a) => [`console.log('Environment:', ${a});`],
  ConsoleError: (a) => [`console.error('Config', ${a});`],
  ConsoleInfo: (a) => [`console.info(${a});`],
  ConsoleBracket: (a) => [`console['log']('Environment:', ${a});`],
  PowertoolsInfo: (a) => [`logger.info('Environment', ${a});`],
  PowertoolsDebug: (a) => [`logger.debug('Environment', { env: ${a} });`],
  NotLog: (a) => [`cache.set('env', ${a});`],
};

const base = {
  rule: 'no-env-logging',
  // Args 14; Sinks 7 x 2 args; Gates 9 x 2 args.
  domain: 14 + 14 + 18,
  traces: 900,
  key: (s) =>
    ['focus', 'arg', 'sink', 'gate'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  code: (s) => {
    const sink = tag(s.sink);
    const gate = tag(s.gate);
    // The evidence gates take a lone `event`: `context` is not in scope there.
    const arg = ARG[tag(s.arg)].replace(
      'context.awsRequestId',
      gate.startsWith('Sdk') || gate === 'NoEvidence'
        ? 'event.id'
        : 'context.awsRequestId',
    );
    return lambdaProgram(
      gate,
      [...SINK[sink](arg), "return { statusCode: 200, body: 'ok' };"],
      {
        pre: [
          ...(sink.startsWith('Powertools') ? POWERTOOLS : []),
          'const cache = new Map();',
        ],
      },
    );
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
