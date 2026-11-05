const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../reliability.cjs');

const BODY = {
  Body: ['const r = await work(item);', 'results.push(r);'],
  NestedBlock: ['if (item) {', '  results.push(await work(item));', '}'],
  // For loops without a header test, the per-iteration test sits in the body.
  Test: ['if (await ok(item)) {', '  results.push(item);', '}'],
  InnerCallback: ['tasks.push(async () => results.push(await work(item)));'],
  NoAwait: ['tasks.push(work(item));'],
};

// Independent work, per loop and position.
function independent(loop, pos) {
  const body = BODY[pos] ?? ['results.push(item);'];
  switch (loop) {
    case 'ForOf':
      return pos === 'OnceSlot'
        ? [
            'for (const item of await loadItems()) {',
            '  results.push(item);',
            '}',
          ]
        : ['for (const item of items) {', ...body.map((l) => `  ${l}`), '}'];
    case 'ForIn':
      return pos === 'OnceSlot'
        ? [
            'for (const item in await loadTable()) {',
            '  results.push(item);',
            '}',
          ]
        : ['for (const item in table) {', ...body.map((l) => `  ${l}`), '}'];
    case 'ForClassic':
      if (pos === 'OnceSlot')
        return [
          'for (let i = await start(); i < items.length; i++) {',
          '  results.push(items[i]);',
          '}',
        ];
      if (pos === 'Test')
        return [
          'for (let i = 0; await more(i); i++) {',
          '  results.push(items[i]);',
          '}',
        ];
      return [
        'for (let i = 0; i < items.length; i++) {',
        '  const item = items[i];',
        ...body.map((l) => `  ${l}`),
        '}',
      ];
    case 'While':
      if (pos === 'OnceSlot')
        return [
          'let i = 0;',
          'const n = await count();',
          'while (i < n) {',
          '  results.push(items[i++]);',
          '}',
        ];
      if (pos === 'Test')
        return [
          'let i = 0;',
          'while (await more(i)) {',
          '  results.push(items[i++]);',
          '}',
        ];
      return [
        'let i = 0;',
        'while (i < items.length) {',
        '  const item = items[i++];',
        ...body.map((l) => `  ${l}`),
        '}',
      ];
    default: // DoWhile
      if (pos === 'OnceSlot')
        return [
          'let i = 0;',
          'const n = await count();',
          'do {',
          '  results.push(items[i++]);',
          '} while (i < n);',
        ];
      if (pos === 'Test')
        return [
          'let i = 0;',
          'do {',
          '  results.push(items[i++]);',
          '} while (await more(i));',
        ];
      return [
        'let i = 0;',
        'do {',
        '  const item = items[i++];',
        ...body.map((l) => `  ${l}`),
        '} while (i < items.length);',
      ];
  }
}

// Each iteration needs the previous iteration's awaited result.
const CARRIED = {
  ForOf: [
    'let acc = seed;',
    'for (const item of items) {',
    '  acc = await step(item, acc);',
    '}',
    'results.push(acc);',
  ],
  ForClassic: [
    'for (let page = await first(); page; page = await page.next()) {',
    '  results.push(page);',
    '}',
  ],
  While: [
    'let cursor: string | undefined = seed;',
    'while (cursor) {',
    '  const page = await getPage(cursor);',
    '  results.push(page);',
    '  cursor = page.next;',
    '}',
  ],
  DoWhile: [
    'let cursor: string | undefined = seed;',
    'do {',
    '  const page = await getPage(cursor);',
    '  results.push(page);',
    '  cursor = page.next;',
    '} while (cursor);',
  ],
};

const PRELUDE = [
  'interface Page { next?: string; next(): Promise<Page | undefined> }',
  'declare function work(x: unknown): Promise<unknown>;',
  'declare function ok(x: unknown): Promise<boolean>;',
  'declare function more(i: number): Promise<boolean>;',
  'declare function start(): Promise<number>;',
  'declare function count(): Promise<number>;',
  'declare function loadItems(): Promise<string[]>;',
  'declare function loadTable(): Promise<Record<string, number>>;',
  'declare function step(x: string, acc: string): Promise<string>;',
  'declare function getPage(c: string): Promise<{ next?: string }>;',
  'declare function first(): Promise<Page | undefined>;',
];

module.exports = {
  rule: 'no-await-in-loop',
  // Positions 5 loops x 6; Options 5 x 2 x 2; Deps 4 x 2; Concurrency 2 x 2.
  domain: 30 + 20 + 8 + 4,
  traces: 1200,
  key: keyOf(
    'focus',
    'loop',
    'pos',
    'dep',
    'allowForOf',
    'allowWhile',
    'checkConcurrency',
  ),
  config: (s) => ({
    allowForOf: s.allowForOf,
    allowWhile: s.allowWhile,
    checkConcurrency: s.checkConcurrency,
  }),
  code: (s) => {
    const loop = tag(s.loop);
    const lines =
      tag(s.dep) === 'Carried' ? CARRIED[loop] : independent(loop, tag(s.pos));
    return [
      ...PRELUDE,
      'export async function run(items: string[], table: Record<string, number>, seed: string) {',
      '  const results: unknown[] = [];',
      '  const tasks: unknown[] = [];',
      ...lines.map((l) => `  ${l}`),
      '  return { results, tasks };',
      '}',
      '',
    ].join('\n');
  },
};
