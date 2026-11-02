const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-sha1-hash',
  domain: 12, // 6 bindings x 2 functions
  traces: 300,
  key: (s) => `${tag(s.binding)}|${tag(s.fn)}`,
  config: () => ({}),
  code: (s) => {
    const f = tag(s.fn) === 'Sha1' ? 'sha1' : 'sha256';
    return {
      Named: `import { ${f} } from 'crypto-hash';\nexport const h = await ${f}(data);`,
      Renamed: `import { ${f} as digest } from 'crypto-hash';\nexport const h = await digest(data);`,
      Namespace: `import * as hashes from 'crypto-hash';\nexport const h = await hashes.${f}(data);`,
      RequireDestructured: `const { ${f} } = require('crypto-hash');\nexport const h = await ${f}(data);`,
      RequireWhole: `const hashes = require('crypto-hash');\nexport const h = await hashes.${f}(data);`,
      OtherPackage: `import { ${f} } from 'another-hash-lib';\nexport const h = await ${f}(data);`,
    }[tag(s.binding)];
  },
  model: (s) => s.verdict,
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
