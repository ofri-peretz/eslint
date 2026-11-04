const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const NAME = {
  LowerMatch: 'userTotal',
  UpperMatch: 'UserTotal',
  NoMatch: 'orderTotal',
};

const SITE = {
  VarDecl: (n) => [`export const ${n} = 1;`],
  FunctionDecl: (n) => [`export function ${n}() { return 1; }`],
  ClassDecl: (n) => [`export class ${n} {}`],
  PropertyDecl: (n) => [`export class Cart { ${n} = 1; }`],
  MethodDecl: (n) => [`export class Cart { ${n}() { return 1; } }`],
  ImportedRef: (n) => [
    `import { ${n} } from './totals';`,
    `export const total = ${n} + 1;`,
  ],
  MemberRead: (n) => [
    'declare const report: Record<string, number>;',
    `export const total = report.${n} + 1;`,
  ],
};

const TERM = {
  NoTerms: undefined,
  StringTerm: {
    terms: [
      {
        incorrect: 'user',
        correct: 'customer',
        context: 'buyers are customers',
      },
    ],
  },
  RegexTerm: {
    terms: [
      {
        incorrect: /user/i,
        correct: 'customer',
        context: 'buyers are customers',
      },
    ],
  },
};

module.exports = {
  rule: 'enforce-naming',
  domain: 3 * 7 * 3,
  traces: 600,
  key: keyOf('terms', 'site', 'name'),
  config: (s) => TERM[tag(s.terms)],
  code: (s) => src(SITE[tag(s.site)](NAME[tag(s.name)])),
};
