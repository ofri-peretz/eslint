const { tag } = require('../../lib.cjs');

const URLS = {
  Http: 'http://api.example.com/data',
  Https: 'https://api.example.com/data',
  Ws: 'ws://socket.example.com/feed',
  Wss: 'wss://socket.example.com/feed',
  Mongo: 'mongodb://db.example.com:27017/app',
  MongoSrv: 'mongodb+srv://cluster0.example.com/app',
  Redis: 'redis://cache.example.com:6379',
  Rediss: 'rediss://cache.example.com:6380',
  Mysql: 'mysql://user:pass@db.example.com/app',
  HttpUpper: 'HTTP://api.example.com/data',
  HttpLocalhost: 'http://localhost:3000/data',
  MongoLocalhost: 'mongodb://localhost:27017/db',
  W3Namespace: 'http://www.w3.org/2000/svg',
  NotUrl: 'served over http by default',
};

module.exports = {
  domain: 224, // 14 urls x 2 forms x ignorePatterns x test file x allowInTests
  traces: 3000,
  rule: 'no-unencrypted-transmission',
  key: (s) =>
    `${tag(s.url)}|${tag(s.form)}|ignore=${s.ignoreLocal}|test=${s.testFile}|allow=${s.allowInTests}`,
  config: (s) => ({
    allowInTests: s.allowInTests,
    ...(s.ignoreLocal ? { ignorePatterns: ['localhost', '127.0.0.1'] } : {}),
  }),
  filename: (s) => (s.testFile ? 'src/client.test.ts' : 'src/client.ts'),
  code: (s) => {
    const u = URLS[tag(s.url)];
    const lit = tag(s.form) === 'Tpl' ? `\`${u}/\${suffix}\`` : `'${u}'`;
    return `declare const suffix: string;\nconst endpoint = ${lit};\n`;
  },
  model: (s) => s.verdict,
};
