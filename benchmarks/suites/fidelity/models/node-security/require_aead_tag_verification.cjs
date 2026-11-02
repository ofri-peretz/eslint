const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  pkg: 'eslint-plugin-node-security',
  rule: 'require-aead-tag-verification',
  domain: 168, // 4 factories x 7 algs x 6 uses
  traces: 2400,
  key: (s) => `${tag(s.factory)}|${tag(s.alg)}|${tag(s.use)}`,
  config: () => ({}),
  code: (s) => {
    const alg = {
      Gcm: "'aes-256-gcm'",
      GcmUpper: "'AES-256-GCM'",
      Ccm: "'aes-128-ccm'",
      Ocb: "'aes-256-ocb'",
      Chacha: "'chacha20-poly1305'",
      Cbc: "'aes-256-cbc'",
      Computed: 'cfg.algorithm',
    }[tag(s.alg)];
    const [imp, fn] = {
      CryptoDot: ["import crypto from 'crypto';", 'crypto.createDecipheriv'],
      NamedImport: [
        "import { createDecipheriv } from 'node:crypto';",
        'createDecipheriv',
      ],
      RenamedImport: [
        "import { createDecipheriv as openBox } from 'crypto';",
        'openBox',
      ],
      RequireNode: [
        "const { createDecipheriv } = require('node:crypto');",
        'createDecipheriv',
      ],
    }[tag(s.factory)];
    const body = {
      TagAndFinal:
        "d.setAuthTag(tag);\n  let out = d.update(ct, 'hex', 'utf8');\n  out += d.final('utf8');\n  return out;",
      FinalOnly:
        "let out = d.update(ct, 'hex', 'utf8');\n  out += d.final('utf8');\n  return out;",
      TagOnly: "d.setAuthTag(tag);\n  return d.update(ct, 'hex', 'utf8');",
      UpdateOnly: "return d.update(ct, 'hex', 'utf8');",
      Streamed:
        'd.setAuthTag(tag);\n  input.pipe(d).pipe(output);\n  return null;',
      Returned: 'return d;',
    }[tag(s.use)];
    return `${imp}\nexport function open(key: Buffer, iv: Buffer, ct: string, tag: Buffer, input: any, output: any) {\n  const d = ${fn}(${alg}, key, iv);\n  ${body}\n}\n`;
  },
  model: (s) => s.verdict,
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
