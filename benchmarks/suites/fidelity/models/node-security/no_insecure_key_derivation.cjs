const { tag } = require('../../lib.cjs');

module.exports = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-insecure-key-derivation',
  domain: 112, // 7 callees x 8 iteration spellings x minIterations default/600000
  traces: 1500,
  key: (s) => `${tag(s.callee)}|${tag(s.iter)}|strict=${s.strict}`,
  config: (s) => (s.strict ? { minIterations: 600000 } : {}),
  code: (s) => {
    const [pre, it] = {
      Lit1000: ['', '1000'],
      Lit99999: ['', '99999'],
      Lit100000: ['', '100000'],
      Lit600000: ['', '600000'],
      Separator10k: ['', '10_000'],
      Exponent1e4: ['', '1e4'],
      ConstLow: ['const ITERATIONS = 5000;\n', 'ITERATIONS'],
      Runtime: ['', 'config.iterations'],
    }[tag(s.iter)];
    const args = `password, salt, ${it}, 32, 'sha256'`;
    return (
      pre +
      {
        Pbkdf2Dot: `import crypto from 'crypto';\ncrypto.pbkdf2(${args}, cb);`,
        Pbkdf2SyncDot: `import crypto from 'crypto';\nconst k = crypto.pbkdf2Sync(${args});`,
        Bracket: `import crypto from 'crypto';\nconst k = crypto['pbkdf2Sync'](${args});`,
        NamedImport: `import { pbkdf2Sync } from 'node:crypto';\nconst k = pbkdf2Sync(${args});`,
        RenamedImport: `import { pbkdf2 as derive } from 'crypto';\nderive(${args}, cb);`,
        RequireNode: `const { pbkdf2Sync } = require('node:crypto');\nconst k = pbkdf2Sync(${args});`,
        Scrypt: `import crypto from 'crypto';\nconst k = crypto.scryptSync(password, salt, ${it});`,
      }[tag(s.callee)]
    );
  },
  model: (s) => s.verdict,
};
