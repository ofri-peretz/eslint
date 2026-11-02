const { tag } = require('../../lib.cjs');

module.exports = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-cryptojs',
  domain: 24, // 6 forms x 4 modules
  traces: 400,
  key: (s) => `${tag(s.form)}|${tag(s.mod)}`,
  config: () => undefined,
  code: (s) => {
    const m = {
      CryptoJs: 'crypto-js',
      CryptoJsSub: 'crypto-js/sha256',
      NodeCrypto: 'node:crypto',
      Lookalike: 'crypto-json',
    }[tag(s.mod)];
    return {
      DefaultImport: `import lib from '${m}';\nexport const x = lib;`,
      NamedImport: `import { SHA256 } from '${m}';\nexport const x = SHA256;`,
      SideEffectImport: `import '${m}';`,
      ExportFrom: `export { default as hashLib } from '${m}';`,
      Require: `const lib = require('${m}');\nexport const x = lib;`,
      DynamicImport: `export async function load() {\n  const lib = await import('${m}');\n  return lib;\n}`,
    }[tag(s.form)];
  },
  model: (s) => s.verdict,
};
