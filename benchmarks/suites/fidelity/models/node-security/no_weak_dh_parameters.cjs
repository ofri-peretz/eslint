const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-weak-dh-parameters',
  domain: 160, // 4 spellings x 4 calls x 5 args x options default/strict
  traces: 2200,
  key: (s) =>
    `${tag(s.spelling)}|${tag(s.call)}|${tag(s.arg)}|strict=${s.strict}`,
  config: (s) =>
    s.strict
      ? { minPrimeBits: 3072, additionalWeakCurves: ['brainpoolP224r1'] }
      : {},
  code: (s) => {
    const call = tag(s.call);
    const fn = {
      GetDH: 'getDiffieHellman',
      CreateGroup: 'createDiffieHellmanGroup',
      CreateDH: 'createDiffieHellman',
      CreateECDH: 'createECDH',
    }[call];
    const args = {
      GetDH: {
        Weak: "'modp2'",
        Strong: "'modp14'",
        WeakConst: "'modp1'",
        Computed: 'cfg.group',
        Other: "'modp99'",
      },
      CreateGroup: {
        Weak: "'modp5'",
        Strong: "'modp14'",
        WeakConst: "'modp2'",
        Computed: 'cfg.group',
        Other: "'modp99'",
      },
      CreateDH: {
        Weak: '1024',
        Strong: '3072',
        WeakConst: '512',
        Computed: 'cfg.bits',
        Other: "primeHex, 'hex'",
      },
      CreateECDH: {
        Weak: "'secp192k1'",
        Strong: "'prime256v1'",
        WeakConst: "'secp160r1'",
        Computed: 'cfg.curve',
        Other: "'brainpoolP224r1'",
      },
    }[call];
    const a = tag(s.arg);
    const pre = a === 'WeakConst' ? `const PARAM = ${args.WeakConst};\n` : '';
    const arg = a === 'WeakConst' ? 'PARAM' : args[a];
    return {
      Member: `import crypto from 'crypto';\n${pre}const dh = crypto.${fn}(${arg});`,
      Subscript: `import crypto from 'crypto';\n${pre}const dh = crypto['${fn}'](${arg});`,
      NamedImport: `import { ${fn} } from 'node:crypto';\n${pre}const dh = ${fn}(${arg});`,
      RequireNode: `const nodeCrypto = require('node:crypto');\n${pre}const dh = nodeCrypto.${fn}(${arg});`,
    }[tag(s.spelling)];
  },
  model: (s) => s.verdict,
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
