const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-static-iv',
  domain: 50, // 5 callees x 10 IV shapes
  traces: 700,
  key: (s) => `${tag(s.callee)}|${tag(s.iv)}`,
  config: () => ({}),
  code: (s) => {
    const c = tag(s.callee);
    const ns = c === 'NamedImport' || c === 'RenamedImport' ? null : 'crypto';
    const random = ns ? `${ns}.randomBytes(16)` : 'randomBytes(16)';
    const [pre, ivExpr] = {
      StringLit: ['', "'1234567890123456'"],
      BufferFromHex: [
        '',
        "Buffer.from('00112233445566778899aabbccddeeff', 'hex')",
      ],
      BufferFromBase64: [
        '',
        "Buffer.from('AAECAwQFBgcICQoLDA0ODw==', 'base64')",
      ],
      BufferFromArray: [
        '',
        'Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])',
      ],
      BufferAllocZero: ['', 'Buffer.alloc(16, 0)'],
      BufferAllocSize: ['', 'Buffer.alloc(16)'],
      ConstStatic: [
        "const IV = Buffer.from('00112233445566778899aabbccddeeff', 'hex');\n",
        'IV',
      ],
      RandomBytes: ['', random],
      ConstRandom: [`const iv = ${random};\n`, 'iv'],
      Param: ['', 'ivParam'],
    }[tag(s.iv)];
    const imp = {
      CryptoDot: "import crypto from 'crypto';",
      CryptoBracket: "import crypto from 'crypto';",
      NamedImport: "import { createCipheriv, randomBytes } from 'node:crypto';",
      RenamedImport:
        "import { createCipheriv as makeCipher, randomBytes } from 'crypto';",
      RequireNode: "const crypto = require('node:crypto');",
    }[c];
    const fn = {
      CryptoDot: 'crypto.createCipheriv',
      CryptoBracket: "crypto['createCipheriv']",
      NamedImport: 'createCipheriv',
      RenamedImport: 'makeCipher',
      RequireNode: 'crypto.createCipheriv',
    }[c];
    return `${imp}\nexport function encrypt(key: Buffer, data: string, ivParam: Buffer) {\n  ${pre}  return ${fn}('aes-256-cbc', key, ${ivExpr}).update(data);\n}\n`;
  },
  model: (s) => s.verdict,
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
