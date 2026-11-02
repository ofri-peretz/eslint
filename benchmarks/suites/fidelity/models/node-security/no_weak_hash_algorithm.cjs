const { tag, num, withTestFile } = require('../../lib.cjs');

const base = {
  domain: 56,
  pkg: 'eslint-plugin-node-security',
  rule: 'no-weak-hash-algorithm',
  key: (s) => `${tag(s.kind)}|${tag(s.alg)}|security=${s.securityUse}`,
  config: () => ({}),
  code: (s) => {
    const alg = {
      Md5: "'md5'",
      Sha1Token: "'sha1'",
      Sha1Hyphen: "'sha-1'",
      Md4: "'md4'",
      Ripemd: "'ripemd160'",
      Sha256: "'sha256'",
      NonLiteral: 'algName',
    }[tag(s.alg)];
    // What is hashed is the evidence of purpose: a password vs plain data.
    const input = s.securityUse ? 'password' : 'fileContents';
    return {
      CryptoCreateHash: `import crypto from 'node:crypto';\nconst d = crypto.createHash(${alg}).update(${input}).digest('hex');`,
      BareCreateHash: `import { createHash } from 'node:crypto';\nconst d = createHash(${alg}).update(${input}).digest('hex');`,
      Sha1Call: `import { sha1 } from 'crypto-hash';\nconst d = await sha1(${input});`,
      OtherCall: `const d = hash(${input});`,
    }[tag(s.kind)];
  },
  model: (s) => s.verdict,
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
