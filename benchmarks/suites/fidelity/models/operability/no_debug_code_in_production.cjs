const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const SPELLING = {
  Global: ["console.log('charging', card.last4);"],
  Subscript: ["console['log']('charging', card.last4);"],
  LocalShadow: [
    'const console = { log: (...a: unknown[]) => audit.push(a) };',
    "console.log('charging', card.last4);",
  ],
  LoggerLog: ["logger.log('charging', card.last4);"],
  NoCall: ['audit.push(card.last4);'],
};

module.exports = {
  rule: 'no-debug-code-in-production',
  domain: 5 * 2 * 2,
  traces: 300,
  key: keyOf('spelling', 'path', 'ignoreNonProductionPaths'),
  config: (s) =>
    s.ignoreNonProductionPaths
      ? undefined
      : { ignoreNonProductionPaths: false },
  filename: (s) =>
    tag(s.path) === 'Script' ? 'scripts/charge.ts' : 'src/payments/charge.ts',
  code: (s) =>
    src(
      'declare const logger: { log(...a: unknown[]): void };',
      'const audit: unknown[] = [];',
      'export function charge(card: { last4: string }) {',
      SPELLING[tag(s.spelling)].map((l) => `  ${l}`),
      '}',
    ),
};
