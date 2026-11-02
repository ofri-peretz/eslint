const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-deprecated-cipher-method',
  domain: 21, // 3 methods x 7 access shapes
  traces: 400,
  key: (s) => `${tag(s.method)}|${tag(s.access)}`,
  config: () => ({}),
  code: (s) => {
    const m = {
      CreateCipher: 'createCipher',
      CreateDecipher: 'createDecipher',
      CreateCipheriv: 'createCipheriv',
    }[tag(s.method)];
    const args =
      m === 'createCipheriv'
        ? "'aes-256-cbc', key, iv"
        : "'aes-256-cbc', password";
    return {
      Member: `import crypto from 'crypto';\nconst c = crypto.${m}(${args});`,
      StaticSubscript: `import crypto from 'crypto';\nconst c = crypto['${m}'](${args});`,
      NamedImport: `import { ${m} } from 'node:crypto';\nconst c = ${m}(${args});`,
      RenamedImport: `import { ${m} as build } from 'crypto';\nconst c = build(${args});`,
      RequireDestructured: `const { ${m} } = require('crypto');\nconst c = ${m}(${args});`,
      RequireNodeNs: `const nodeCrypto = require('node:crypto');\nconst c = nodeCrypto.${m}(${args});`,
      ForgeLibrary: `import forge from 'node-forge';\nconst c = forge.cipher.${m}('AES-CBC', key);`,
    }[tag(s.access)];
  },
  model: (s) => s.verdict,
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
