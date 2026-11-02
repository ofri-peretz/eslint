const { tag } = require('../../lib.cjs');

const c = (n) => String.fromCodePoint(n);
const CYR_A = c(0x0430);
const GREEK_O = c(0x03bf);
const ZWSP = c(0x200b);
const RLO = c(0x202e);
const ZWNJ = c(0x200c);

module.exports = {
  domain: 44,
  traces: 400,
  rule: 'no-homoglyph-identifiers',
  key: (s) => `${tag(s.kind)}|ids=${s.checkIds}|strs=${s.checkStrs}`,
  config: (s) => ({ checkIdentifiers: s.checkIds, checkStrings: s.checkStrs }),
  code: (s) => {
    const body = {
      IdentCyrMixed: `const ${CYR_A}dminRole = 'guest';\nexport const r = ${CYR_A}dminRole;`,
      IdentGreekMixed: `const r${GREEK_O}le = 'guest';\nexport const r = r${GREEK_O}le;`,
      IdentAllCyr: 'const имя = 1;\nexport const r = имя;',
      PrivCyrMixed: `export class Session {\n  #${CYR_A}dmin = true;\n  get v() { return this.#${CYR_A}dmin; }\n}`,
      StrZwspAscii: `export const ADMIN_GROUP = 'admin${ZWSP}';`,
      StrRloAscii: `export const label = 'user${RLO}admin';`,
      StrZwnjPersian: `export const fa = 'می${ZWNJ}خواهم';`,
      StrEscaped: "export const ZERO_WIDTH = 'admin\\u200B';",
      StrCyrText: "export const ru = 'Войти';",
      StrHomoglyph: `export const s = '${CYR_A}dmin';`,
      TplZwspAscii: `declare const x: string;\nexport const t = \`admin${ZWSP}\${x}\`;`,
    }[tag(s.kind)];
    return `${body}\n`;
  },
};
