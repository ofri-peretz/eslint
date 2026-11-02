const { tag } = require('../../lib.cjs');

module.exports = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-ecb-mode',
  domain: 256, // 8 callees x 8 algs x allowInTests x test file
  traces: 3200,
  key: (s) =>
    `${tag(s.callee)}|${tag(s.alg)}|allowInTests=${s.allowInTests}|testFile=${s.testFile}`,
  filename: (s) => (s.testFile ? 'src/app.test.ts' : 'src/app.ts'),
  config: (s) => ({ allowInTests: s.allowInTests }),
  code: (s) => {
    const alg = {
      Aes128Ecb: "'aes-128-ecb'",
      Aes256EcbUpper: "'AES-256-ECB'",
      DesEcb: "'des-ecb'",
      BfEcb: "'bf-ecb'",
      TemplateEcb: '`aes-192-ecb`',
      Gcm: "'aes-256-gcm'",
      Cbc: "'aes-256-cbc'",
      NonLiteral: 'cfg.algorithm',
    }[tag(s.alg)];
    const args = `${alg}, key, iv`;
    return {
      CryptoDot: `import crypto from 'crypto';\nconst c = crypto.createCipheriv(${args});`,
      CryptoBracket: `import crypto from 'crypto';\nconst c = crypto['createCipheriv'](${args});`,
      NamedImport: `import { createCipheriv } from 'node:crypto';\nconst c = createCipheriv(${args});`,
      RenamedImport: `import { createCipheriv as makeCipher } from 'crypto';\nconst c = makeCipher(${args});`,
      RequireDestructured: `const { createCipheriv } = require('node:crypto');\nconst c = createCipheriv(${args});`,
      NodeSpecifierNs: `import * as nodeCrypto from 'node:crypto';\nconst c = nodeCrypto.createCipheriv(${args});`,
      DecipherDot: `import crypto from 'crypto';\nconst d = crypto.createDecipheriv(${args});`,
      UnrelatedObject: `import { video } from './codec';\nconst c = video.encodeFrame(${args});`,
    }[tag(s.callee)];
  },
  model: (s) => s.verdict,
};
