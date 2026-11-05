const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

// [field lines, constructor parameter list]
const MEMBERS = {
  AllReadonly: [
    ['readonly amount: number;', 'readonly items: string[] = [];'],
    'amount: number',
  ],
  MutableField: [
    ['amount: number;', 'readonly items: string[] = [];'],
    'amount: number',
  ],
  MutableParamProp: [
    ['readonly items: string[] = [];'],
    'public amount: number',
  ],
  ReadonlyParamProp: [
    ['readonly items: string[] = [];'],
    'private readonly amount: number',
  ],
  NoFields: [[], 'amount: number'],
};

const FREEZE = {
  NoFreeze: [],
  FreezeThis: ['Object.freeze(this);'],
  FreezeNested: ['Object.freeze(this.items);'],
};

module.exports = {
  rule: 'ddd-value-object-immutability',
  // Shapes 5 x 3; Options 3 x 2 x 2 x 2; Names 2 x 2 x 2.
  domain: 15 + 24 + 8,
  traces: 800,
  key: keyOf(
    'focus',
    'members',
    'freeze',
    'name',
    'customPattern',
    'requireReadonly',
    'checkObjectFreeze',
  ),
  config: (s) => {
    const o = {};
    if (s.customPattern) o.valueObjectPatterns = ['Money'];
    if (!s.requireReadonly) o.requireReadonly = false;
    if (!s.checkObjectFreeze) o.checkObjectFreeze = false;
    return Object.keys(o).length ? o : undefined;
  },
  code: (s) => {
    const [fields, params] = MEMBERS[tag(s.members)];
    const assigns =
      tag(s.members) === 'AllReadonly' || tag(s.members) === 'MutableField'
        ? ['this.amount = amount;']
        : tag(s.members) === 'NoFields'
          ? ['void amount;']
          : [];
    const name = tag(s.name) === 'VoName' ? 'PriceValueObject' : 'Money';
    return src(
      `export class ${name} {`,
      fields.map((l) => `  ${l}`),
      `  constructor(${params}) {`,
      assigns.map((l) => `    ${l}`),
      FREEZE[tag(s.freeze)].map((l) => `    ${l}`),
      '  }',
      '}',
    );
  },
};
