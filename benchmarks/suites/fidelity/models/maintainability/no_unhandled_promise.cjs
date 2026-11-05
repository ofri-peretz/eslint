const { tag, withTestFile } = require('../../lib.cjs');
const { keyOf } = require('../../reliability.cjs');

const PRODUCER = {
  AsyncDecl: 'save(id)',
  AsyncArrow: 'persist(id)',
  NewPromise: 'new Promise<void>((resolve) => setTimeout(resolve, 10))',
  PromiseStatic: "Promise.reject(new Error('offline'))",
  ThenChain: 'client.connect().then(onReady)',
  Fetch: 'fetch(url)',
  AnnotatedParam: 'store()',
  UnknownCall: 'loadUser(id)',
  SyncLocal: 'compute(id)',
};

const HANDLING = {
  Bare: (p) => [`${p};`],
  Catch: (p) => [`${p}.catch((e) => log(e));`],
  ThenTwoArgs: (p) => [`${p}.then(ok, fail);`],
  ThenOnly: (p) => [`${p}.then(ok);`],
  FinallyOnly: (p) => [`${p}.finally(done);`],
  CatchNoArg: (p) => [`${p}.catch();`],
  CatchThenFinally: (p) => [`${p}.catch((e) => log(e)).finally(done);`],
  Awaited: (p) => [`await ${p};`],
  Returned: (p) => [`return ${p};`],
  Assigned: (p) => [`const pending = ${p};`, 'return pending;'],
  PassedToLog: (p) => [`console.log(${p});`],
  InTryNoAwait: (p) => ['try {', `  ${p};`, '} catch (e) {', '  log(e);', '}'],
  InTryAwait: (p) => [
    'try {',
    `  await ${p};`,
    '} catch (e) {',
    '  log(e);',
    '}',
  ],
  PromiseAll: (p) => [`await Promise.all([${p}, save(0)]);`],
  Voided: (p) => [`void ${p};`],
};

module.exports = withTestFile(
  {
    rule: 'no-unhandled-promise',
    // Producers 9 x 2; Handlings 15 x 2; VoidOpt 2; EvidenceOpts 2 x 2.
    domain: 18 + 30 + 2 + 4,
    traces: 1200,
    key: keyOf(
      'focus',
      'producer',
      'handling',
      'ignoreVoidExpressions',
      'listed',
      'requirePromiseEvidence',
    ),
    config: (s) => ({
      ignoreVoidExpressions: s.ignoreVoidExpressions,
      requirePromiseEvidence: s.requirePromiseEvidence,
      ...(tag(s.listed) === 'ListsLoadUser'
        ? { promiseReturning: ['fetch', 'loadUser'] }
        : {}),
    }),
    code: (s) =>
      [
        'declare const client: { connect(): Promise<void> };',
        'declare function log(e: unknown): void;',
        'declare function onReady(): void;',
        'declare function ok(): void;',
        'declare function fail(e: unknown): void;',
        'declare function done(): void;',
        'declare function loadUser(id: number): unknown;',
        'async function save(id: number) {',
        '  return id;',
        '}',
        'const persist = async (id: number) => id;',
        'function compute(id: number) {',
        '  return id * 2;',
        '}',
        'export async function run(id: number, url: string, store: () => Promise<void>) {',
        ...HANDLING[tag(s.handling)](PRODUCER[tag(s.producer)]).map(
          (l) => `  ${l}`,
        ),
        '  return undefined;',
        '}',
        '',
      ].join('\n'),
  },
  { option: 'ignoreInTests', flip: false },
);
