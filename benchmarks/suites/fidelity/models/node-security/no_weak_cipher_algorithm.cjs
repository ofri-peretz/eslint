const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-weak-cipher-algorithm',
  domain: 192, // 8 callees x 12 algs x additionalWeakCiphers set/unset
  traces: 2500,
  key: (s) => `${tag(s.callee)}|${tag(s.alg)}|extraCast5=${s.extraCast5}`,
  config: (s) => ({ additionalWeakCiphers: s.extraCast5 ? ['cast5-cbc'] : [] }),
  code: (s) => {
    const alg = {
      Des: "'des'",
      DesEde3Upper: "'DES-EDE3-CBC'",
      Des3Alias: "'des3'",
      Rc4: "'rc4'",
      Bf: "'bf-cbc'",
      Blowfish: "'blowfish'",
      Rc2Cbc: "'rc2-cbc'",
      IdeaCbc: "'idea-cbc'",
      Cast5: "'cast5-cbc'",
      Aes: "'aes-256-gcm'",
      Chacha: "'chacha20-poly1305'",
      NonLiteral: 'cfg.cipher',
    }[tag(s.alg)];
    const args = `${alg}, key, iv`;
    return {
      CryptoDot: `import crypto from 'crypto';\nconst c = crypto.createCipheriv(${args});`,
      CryptoBracket: `import crypto from 'crypto';\nconst c = crypto['createCipheriv'](${args});`,
      NamedImport: `import { createCipheriv } from 'node:crypto';\nconst c = createCipheriv(${args});`,
      RenamedImport: `import { createCipheriv as makeCipher } from 'crypto';\nconst c = makeCipher(${args});`,
      RequireNode: `const nodeCrypto = require('node:crypto');\nconst c = nodeCrypto.createCipheriv(${args});`,
      DecipherDot: `import crypto from 'crypto';\nconst d = crypto.createDecipheriv(${args});`,
      DeprecatedCreateCipher: `import crypto from 'crypto';\nconst c = crypto.createCipher(${alg}, password);`,
      UnrelatedObject: `import { codecs } from './media';\nconst c = codecs.lookup(${args});`,
    }[tag(s.callee)];
  },
  model: (s) => s.verdict,
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
