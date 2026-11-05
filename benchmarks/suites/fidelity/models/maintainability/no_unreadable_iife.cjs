const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const BODY = {
  Small: ['const a = read();', 'use(a);'],
  Many: [
    'const a = read();',
    'const b = read();',
    'use(a);',
    'use(b);',
    'use(a + b);',
  ],
  ManyReturning: [
    'const a = read();',
    'const b = read();',
    'use(a);',
    'use(b);',
    'return a + b;',
  ],
  TopIf: ['if (ready()) use(read());'],
  TryMain: ['try {', '  use(read());', '} catch (e) {', '  fail(e);', '}'],
  Deep3: [
    'if (ready()) {',
    '  for (const x of list()) {',
    '    if (x) use(x);',
    '  }',
    '}',
  ],
  Deep2: ['if (ready()) {', '  for (const x of list()) use(x);', '}'],
  NestedFn: ['function step(n: number) { use(n); }', 'step(read());'],
  ThreeParams: ['use(x + y);', 'use(z);'],
};

function iife(form, body, params, args) {
  const lines = body.map((l) => `    ${l}`);
  switch (form) {
    case 'Arrow':
      return [`(${params} => {`, ...lines, `  })(${args})`];
    case 'AsyncArrow':
      return [`(async ${params} => {`, ...lines, `  })(${args})`];
    case 'FunctionExpr':
      return [`(function ${params} {`, ...lines, `  })(${args})`];
    default:
      return [
        `(function ${params} {`,
        ...lines,
        `  }).call(this${args ? `, ${args}` : ''})`,
      ];
  }
}

const OPTS = {
  Defaults: undefined,
  MaxStatementsSix: { maxStatements: 6 },
  NoReturnAllowance: { allowReturningIIFE: false },
  MaxDepthThree: { maxDepth: 3 },
};

module.exports = {
  rule: 'no-unreadable-iife',
  domain: 4 * 9 * 4,
  traces: 900,
  key: keyOf('form', 'body', 'opts'),
  config: (s) => OPTS[tag(s.opts)],
  code: (s) => {
    const b = tag(s.body);
    const three = b === 'ThreeParams';
    const lines = iife(
      tag(s.form),
      BODY[b],
      three ? '(x: number, y: number, z: number)' : '()',
      three ? '1, 2, 3' : '',
    );
    const call =
      b === 'ManyReturning'
        ? [
            '  const value = ' + lines[0],
            ...lines.slice(1, -1),
            lines.at(-1) + ';',
            '  use(value);',
          ]
        : ['  ' + lines[0], ...lines.slice(1, -1), lines.at(-1) + ';'];
    return src(
      'declare function read(): number;',
      'declare function use(v: unknown): void;',
      'declare function ready(): boolean;',
      'declare function list(): number[];',
      'declare function fail(e: unknown): void;',
      'export function boot(this: unknown) {',
      call,
      '}',
    );
  },
};
