const { tag } = require('../../lib.cjs');

module.exports = {
  pkg: 'eslint-plugin-node-security',
  rule: 'require-storage-encryption',
  domain: 60, // 6 calls x 2 paths x 5 values
  traces: 1000,
  key: (s) => `${tag(s.fn)}|${tag(s.path)}|${tag(s.value)}`,
  config: () => undefined,
  code: (s) => {
    const p =
      tag(s.path) === 'CredPath' ? "'session_token.txt'" : "'sitemap.xml'";
    const v = {
      Token: 'token',
      Key: 'key',
      Plain: 'sitemap',
      EncryptedToken: 'encrypt(token)',
      OpaqueEncryptedToken: 'vaultEncrypt(token)',
    }[tag(s.value)];
    const call = {
      WriteFileSync: `fs.writeFileSync(${p}, ${v});`,
      AppendFile: `fs.appendFile(${p}, ${v}, done);`,
      PromisesNamedWriteFile: `await writeFile(${p}, ${v});`,
      FsPromisesMember: `await fs.promises.writeFile(${p}, ${v});`,
      ReadFileSync: `const loaded = fs.readFileSync(${p}); // ${v}`,
      LocalStorageSetItem: `localStorage.setItem(${p}, ${v});`,
    }[tag(s.fn)];
    return `import fs from 'node:fs';\nimport { writeFile } from 'node:fs/promises';\nimport { encrypt as vaultEncrypt } from './vault';\nimport { publicEncrypt } from 'node:crypto';\ndeclare const PUBLIC_KEY: string;\nfunction encrypt(v: string) {\n  return publicEncrypt(PUBLIC_KEY, Buffer.from(v));\n}\nexport async function persist(token: string, key: string, sitemap: string, done: () => void) {\n  ${call}\n}\n`;
  },
  model: (s) => s.verdict,
};
