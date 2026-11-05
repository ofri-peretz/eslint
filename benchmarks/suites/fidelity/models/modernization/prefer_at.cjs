const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

// [receiver as written, receiver whose length the index reads]
const RECEIVER = {
  Ident: ['xs', 'xs'],
  Member: ['this.rows', 'this.rows'],
  Subscript: ["this['rows']", "this.rows['length'] && this.rows"],
  NonNull: ['maybe!', 'maybe!'],
  Arguments: ['arguments', 'arguments'],
  Mismatch: ['xs', 'ys'],
};

const INDEX = {
  LastLit: (r) => `${r}.length - 1`,
  OffsetLit: (r) => `${r}.length - 2`,
  VarOffset: (r) => `${r}.length - n`,
  ZeroOffset: (r) => `${r}.length - 0`,
  Plain: () => '0',
};

function access(s) {
  const [obj, lenOf] = RECEIVER[tag(s.receiver)];
  // `this.rows['length'] && this.rows` is not a receiver; spell the
  // string-subscript length read directly instead.
  const len =
    tag(s.receiver) === 'Subscript'
      ? INDEX[tag(s.index)]("this['rows']").replace(
          "this['rows'].length",
          "this.rows['length']",
        )
      : INDEX[tag(s.index)](lenOf);
  return `${obj}[${len}]`;
}

function use(s) {
  const a = access(s);
  switch (tag(s.pos)) {
    case 'Write':
      return `${a} = v;`;
    case 'Callee':
      return `${a}();`;
    default:
      return `out.push(${a});`;
  }
}

module.exports = {
  rule: 'prefer-at',
  domain: 6 * 5 * 3 * 2,
  traces: 2500,
  key: keyOf('receiver', 'index', 'pos', 'checkLastElement'),
  config: (s) => (s.checkLastElement ? undefined : { checkLastElement: false }),
  code: (s) =>
    src(
      'declare const out: unknown[];',
      'export class Table {',
      '  rows: any[] = [];',
      '  run(xs: any[], ys: any[], maybe: any[] | undefined, n: number, v: any) {',
      '    const f = function (this: unknown) {',
      `      ${tag(s.receiver) === 'Arguments' ? use(s) : ''}`,
      '    };',
      `    ${tag(s.receiver) === 'Arguments' ? 'f();' : use(s)}`,
      '  }',
      '}',
    ),
};
