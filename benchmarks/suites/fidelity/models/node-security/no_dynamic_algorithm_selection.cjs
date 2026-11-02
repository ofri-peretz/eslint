const { tag } = require('../../lib.cjs');

const NAME = {
  CreateHash: 'createHash',
  CreateHmac: 'createHmac',
  CreateCipheriv: 'createCipheriv',
  CreateDecipheriv: 'createDecipheriv',
  CreateSign: 'createSign',
  CreateVerify: 'createVerify',
};
const LIT = {
  CreateHash: 'sha256',
  CreateHmac: 'sha256',
  CreateCipheriv: 'aes-256-gcm',
  CreateDecipheriv: 'aes-256-gcm',
  CreateSign: 'RSA-SHA256',
  CreateVerify: 'RSA-SHA256',
};

module.exports = {
  rule: 'no-dynamic-algorithm-selection',
  domain: 252, // 6 functions x 6 bindings x 7 algorithm sources
  traces: 2800,
  key: (s) => `${tag(s.fn)}|${tag(s.binding)}|${tag(s.alg)}`,
  code: (s) => {
    const f = tag(s.fn);
    const n = NAME[f];
    const lit = LIT[f];
    const a = {
      Literal: `'${lit}'`,
      StaticTemplate: `\`${lit}\``,
      Param: 'algorithm',
      Env: 'process.env.CRYPTO_ALG',
      RecordField: 'record.algName',
      AllowlistConst: 'ALGORITHMS[tier]',
      MutableTable: 'TABLE[tier]',
    }[tag(s.alg)];
    const rest = {
      CreateHash: '',
      CreateHmac: ', key',
      CreateCipheriv: ', key, iv',
      CreateDecipheriv: ', key, iv',
      CreateSign: '',
      CreateVerify: '',
    }[f];
    const [head, callee] = {
      CjsCrypto: ["const crypto = require('crypto');", `crypto.${n}`],
      EsmNodeDefault: ["import crypto from 'node:crypto';", `crypto.${n}`],
      NamedRenamedNode: [`import { ${n} as make } from 'node:crypto';`, 'make'],
      CjsDestructure: [`const { ${n} } = require('node:crypto');`, n],
      Bracket: [
        "import * as nodeCrypto from 'node:crypto';",
        `nodeCrypto['${n}']`,
      ],
      LocalObject: [
        `const crypto = { ${n}: (...args: unknown[]) => args };`,
        `crypto.${n}`,
      ],
    }[tag(s.binding)];
    const tables =
      `const ALGORITHMS = { strong: '${lit}', stronger: '${lit}' } as const;\n` +
      `const TABLE: Record<string, string> = { strong: '${lit}' };\nTABLE.legacy = String(Date.now());`;
    return `${head}\n${tables}\nexport function run(algorithm: string, tier: 'strong' | 'stronger', record: any, key: any, iv: any) {\n  return ${callee}(${a}${rest});\n}\n`;
  },
  model: (s) => s.verdict,
};
