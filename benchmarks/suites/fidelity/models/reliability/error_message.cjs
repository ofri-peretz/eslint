const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../reliability.cjs');

const MSG = {
  Missing: '',
  EmptyLiteral: "''",
  Blank: "'   '",
  Literal: "'user not found'",
  Template: '`user ${id} not found`',
  EmptyTemplate: '``',
  Variable: 'reason',
  UndefinedArg: 'undefined',
  Concat: "'user ' + id",
};

// [module head, expression given the constructor name and argument source]
const FORM = {
  New: ['', (c, a) => `new ${c}(${a})`],
  Call: ['', (c, a) => `${c}(${a})`],
  GlobalThisNew: ['', (c, a) => `new globalThis.${c}(${a})`],
  GlobalThisCall: ['', (c, a) => `globalThis.${c}(${a})`],
  ShadowedLocal: [null, (c, a) => `new ${c}(${a})`],
  CustomClass: [
    'class NotFoundError extends Error {}',
    (_c, a) => `new NotFoundError(${a})`,
  ],
};

module.exports = {
  rule: 'error-message',
  // Ctors 7 x 2 msgs; Forms 6 x 2; Messages 9; Catches 3 places x 2 opts x 2 msgs.
  domain: 14 + 12 + 9 + 12,
  traces: 900,
  key: keyOf('focus', 'ctor', 'form', 'msg', 'place', 'allowEmptyCatch'),
  config: (s) => ({ allowEmptyCatch: s.allowEmptyCatch }),
  code: (s) => {
    const c = tag(s.ctor);
    const [head, make] = FORM[tag(s.form)];
    const expr = make(c, MSG[tag(s.msg)]);
    const body = {
      ThrowOutside: [`throw ${expr};`],
      AssignOutside: [`const failure = ${expr};`, 'return failure;'],
      ThrowInCatch: [
        'try {',
        '  return JSON.parse(reason);',
        '} catch {',
        `  throw ${expr};`,
        '}',
      ],
    }[tag(s.place)];
    return [
      head ?? `class ${c} { constructor(public readonly detail?: unknown) {} }`,
      'export function lookup(id: number, reason: string) {',
      ...body.map((l) => `  ${l}`),
      '}',
      '',
    ].join('\n');
  },
};
