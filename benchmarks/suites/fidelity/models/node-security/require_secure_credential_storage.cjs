const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'require-secure-credential-storage',
  domain: 72, // 9 sinks x 8 evidence shapes
  traces: 1100,
  key: (s) => `${tag(s.sink)}|${tag(s.evidence)}`,
  code: (s) => {
    const env = ['EnvDot', 'EnvBracketLiteral', 'EnvRead'].includes(
      tag(s.sink),
    );
    // [storage key, env key, value]
    const [k, ek, v] = {
      CredKeyPlain: ['authToken', 'SESSION_TOKEN', 'token'],
      ThemeKey: ['theme', 'PORT', "'dark'"],
      KeyAlone: ['key', 'KEY', 'publicKey'],
      CredKeyEncrypted: ['authToken', 'API_TOKEN', 'encrypt(token)'],
      CredKeyOpaqueEncrypt: ['authToken', 'API_TOKEN', 'opaqueEncrypt(token)'],
      CredKeyEncryptedVar: ['authToken', 'API_TOKEN', 'encrypted'],
      CredKeyBase64: ['authToken', 'API_TOKEN', 'btoa(token)'],
      NeutralKeyPasswordValue: ['session', 'SESSION', 'password'],
    }[tag(s.evidence)];
    void env;
    const [head, stmt] = {
      LocalStorage: ['', `localStorage.setItem('${k}', ${v});`],
      SessionStorage: ['', `sessionStorage.setItem('${k}', ${v});`],
      WindowLocalStorage: ['', `window.localStorage.setItem('${k}', ${v});`],
      AsyncStorage: [
        "import AsyncStorage from '@react-native-async-storage/async-storage';",
        `await AsyncStorage.setItem('${k}', ${v});`,
      ],
      EnvDot: ['', `process.env.${ek} = ${v};`],
      EnvBracketLiteral: ['', `process.env['${ek}'] = ${v};`],
      CacheSetItem: [
        'const cache = new Map<string, unknown>() as any;',
        `cache.setItem('${k}', ${v});`,
      ],
      FsWrite: [
        "import fs from 'node:fs';",
        `fs.writeFileSync('${k}.json', String(${v}));`,
      ],
      EnvRead: [
        '',
        `const current = process.env.${ek};\n  return [current, ${v}];`,
      ],
    }[tag(s.sink)];
    const crypto =
      "import { publicEncrypt } from 'node:crypto';\ndeclare const PUBLIC_KEY: string;\n" +
      'function encrypt(v: string) {\n  return publicEncrypt(PUBLIC_KEY, Buffer.from(v));\n}\n' +
      'declare function opaqueEncrypt(v: string): string;';
    return `${head}\n${crypto}\nexport async function save(token: string, password: string, publicKey: string, encrypted: string) {\n  ${stmt}\n}\n`;
  },
  model: (s) => s.verdict,
};
