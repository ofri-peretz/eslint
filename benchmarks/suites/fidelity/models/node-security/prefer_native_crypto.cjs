const { tag } = require('../../lib.cjs');

module.exports = {
  pkg: 'eslint-plugin-node-security',
  rule: 'prefer-native-crypto',
  domain: 40, // 4 forms x 10 modules
  traces: 700,
  key: (s) => `${tag(s.form)}|${tag(s.mod)}`,
  config: () => undefined,
  code: (s) => {
    const [m, sub] = {
      CryptoJs: ['crypto-js', 'crypto-js/aes'],
      Sjcl: ['sjcl', 'sjcl/sjcl.js'],
      NodeForge: ['node-forge', 'node-forge/lib/pki'],
      JsSha256: ['js-sha256', 'js-sha256/src/sha256.js'],
      AesJs: ['aes-js', 'aes-js/index.js'],
      Bcryptjs: ['bcryptjs', 'bcryptjs/dist/bcrypt.js'],
      BlueimpMd5: ['blueimp-md5', 'blueimp-md5/js/md5.js'],
      NodeCrypto: ['node:crypto', 'node:crypto'],
      Bcrypt: ['bcrypt', 'bcrypt'],
      Argon2: ['argon2', 'argon2'],
    }[tag(s.mod)];
    return {
      Import: `import lib from '${m}';\nexport const x = lib;`,
      Require: `const lib = require('${m}');\nexport const x = lib;`,
      DynamicImport: `export async function load() {\n  return import('${m}');\n}`,
      Subpath: `import lib from '${sub}';\nexport const x = lib;`,
    }[tag(s.form)];
  },
  model: (s) => s.verdict,
};
