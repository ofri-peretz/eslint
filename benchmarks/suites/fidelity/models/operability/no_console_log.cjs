const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const CALL = {
  ConsoleLog: ["console.log('loaded', id);"],
  ConsoleLogSubscript: ["console['log']('loaded', id);"],
  ConsoleDebug: ["console.debug('loaded', id);"],
  ConsoleError: ["console.error('failed', id);"],
  ShadowedConsoleLog: [
    'const console = { log: (...a: unknown[]) => sink.push(a) };',
    "console.log('loaded', id);",
  ],
  OldLoggerLog: ["oldLogger.log('loaded', id);"],
  LoggerDebug: ["logger.debug('loaded', id);"],
};

const FILE = {
  Shipped: 'src/users/load.ts',
  Script: 'scripts/load.ts',
  Legacy: 'src/legacy/load.ts',
};

module.exports = {
  rule: 'no-console-log',
  // Spellings 4; Methods 4 x 2; Sources 3 x 2; Paths 3 x 3; Shaping 3.
  domain: 4 + 8 + 6 + 9 + 3,
  traces: 900,
  key: keyOf(
    'focus',
    'call',
    'methodOpt',
    'sourceOpt',
    'path',
    'pathOpt',
    'shape',
  ),
  filename: (s) => FILE[tag(s.path)],
  config: (s) => {
    const o = {};
    if (tag(s.methodOpt) === 'DebugMapped')
      o.severityMap = { debug: 'verbose' };
    if (tag(s.sourceOpt) === 'WithOldLogger')
      o.sourcePatterns = ['console', 'oldLogger'];
    if (tag(s.pathOpt) === 'IgnoreLegacy') o.ignorePaths = ['src/legacy'];
    if (tag(s.pathOpt) === 'NonProdOff') o.ignoreNonProductionPaths = false;
    if (tag(s.shape) === 'Convert') o.strategy = 'convert';
    if (tag(s.shape) === 'MaxOne') o.maxOccurrences = 1;
    return Object.keys(o).length ? o : undefined;
  },
  code: (s) =>
    src(
      'declare const oldLogger: { log(...a: unknown[]): void };',
      'declare const logger: { debug(...a: unknown[]): void };',
      'const sink: unknown[] = [];',
      'export function load(id: string) {',
      CALL[tag(s.call)].map((l) => `  ${l}`),
      '  return sink;',
      '}',
    ),
};
