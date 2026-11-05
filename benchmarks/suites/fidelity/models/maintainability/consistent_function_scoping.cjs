const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

// [extra parameters, body statements] of the helper.
const USES = {
  NoOuter: ['', 'return x * 2;'],
  OuterParam: ['', 'return x * factor;'],
  OuterLocal: ['', 'return x * scale;'],
  ShadowedOuterName: ['', 'const factor = 2; return x * factor;'],
  ModuleVar: ['', 'return x * RATE;'],
  UsesThis: ['', 'return x * this.rate;'],
  OuterInNestedCallback: ['', 'return [x].map((v) => v * factor)[0];'],
  OuterInDefaultParam: [', f: number = factor', 'return x * f;'],
  OuterType: ['', 'const y: Unit = x; return y;'],
  OuterSibling: ['', 'return other(x);'],
};

const SHAPE = {
  FunctionDecl: (p, b) => [
    `function helper(x: number${p}) { ${b} }`,
    'return helper(1);',
  ],
  ArrowConst: (p, b) => [
    `const helper = (x: number${p}) => { ${b} };`,
    'return helper(1);',
  ],
  FunctionExprConst: (p, b) => [
    `const helper = function (x: number${p}) { ${b} };`,
    'return helper(1);',
  ],
  InlineCallback: (p, b) => [`return [1].map((x: number${p}) => { ${b} })[0];`],
};

// The outer scope's own bindings, used by the helper or not.
const OUTER = [
  'const scale = 3;',
  'type Unit = number;',
  'const other = (v: number) => v * factor;',
];

module.exports = {
  rule: 'consistent-function-scoping',
  domain: 4 * 10 * 3 * 2,
  traces: 1300,
  key: keyOf('shape', 'uses', 'container', 'checkArrowFunctions'),
  config: (s) =>
    s.checkArrowFunctions ? undefined : { checkArrowFunctions: false },
  code: (s) => {
    const [p, b] = USES[tag(s.uses)];
    const inner = SHAPE[tag(s.shape)](p, b);
    const head = ['const RATE = 2;'];
    switch (tag(s.container)) {
      case 'OuterFunction':
        return src(
          head,
          'export function outer(factor: number) {',
          [...OUTER, ...inner].map((l) => `  ${l}`),
          '}',
        );
      case 'ClassMethod':
        return src(
          head,
          'export class Calc {',
          '  rate = 1;',
          '  run(factor: number) {',
          [...OUTER, ...inner].map((l) => `    ${l}`),
          '  }',
          '}',
        );
      default: {
        // Everything at module level; the trailing `return` becomes an export.
        const [decl, ...rest] = inner;
        const body = rest.length
          ? decl
          : decl.replace(/^return /, 'export const out = ');
        return src(
          head,
          'const factor = 4;',
          'const rate = 1;',
          OUTER,
          body,
          'export { helperUse };',
          'function helperUse() { return 0; }',
        );
      }
    }
  },
};
