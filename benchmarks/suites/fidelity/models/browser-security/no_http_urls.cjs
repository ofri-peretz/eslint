const { tag } = require('../../lib.cjs');

const URLS = {
  HttpRemote: 'http://api.example.com/v1/auth',
  HttpsRemote: 'https://api.example.com/v1/auth',
  HttpUpper: 'HTTP://api.example.com/v1/auth',
  HttpLocalhost: 'http://localhost/app',
  HttpLocalhostPort: 'http://localhost:3000/app',
  Http127: 'http://127.0.0.1:8000/app',
  HttpLocalhostLookalike: 'http://localhost.evil-corp.com/app',
  HttpW3Svg: 'http://www.w3.org/2000/svg',
  HttpW3Path: 'http://cdn.example-corp.com/w3.org/lib.js',
  HttpW3Lookalike: 'http://www.w3.org.evil-corp.com/lib.js',
  HttpUnlistedNs: 'http://ns.example-vendor.net/v1/',
  HttpPort8080: 'http://api.example.com:8080/v1',
  HttpDevInternal: 'http://dev.internal/v1',
  NotUrl: 'the http protocol is plaintext',
};

module.exports = {
  domain: 560, // 14 urls x 2 forms x 5 positions x 2 x 2 options
  traces: 7000,
  rule: 'no-http-urls',
  key: (s) =>
    `${tag(s.url)}|${tag(s.form)}|${tag(s.pos)}|port=${s.portOpt}|host=${s.hostOpt}`,
  config: (s) => ({
    allowedHosts: s.hostOpt
      ? ['localhost', '127.0.0.1', 'dev.internal']
      : ['localhost', '127.0.0.1'],
    allowedPorts: s.portOpt ? [8080] : [],
  }),
  code: (s) => {
    const u = URLS[tag(s.url)];
    const lit = tag(s.form) === 'Tpl' ? `\`${u}\${suffix}\`` : `'${u}'`;
    const body = {
      Var: `const target = ${lit};`,
      XmlnsProp: `const attrs = { xmlns: ${lit} };`,
      XmlnsColonProp: `const attrs = { 'xmlns:ext': ${lit} };`,
      NsArgument: `el.getAttributeNS(${lit}, 'id');`,
      NsConstAlsoFetched: `const target = ${lit}; el.getAttributeNS(target, 'id'); fetchIt(target);`,
    }[tag(s.pos)];
    return `declare const suffix: string;\ndeclare const el: Element;\ndeclare function fetchIt(u: string): void;\n${body}\n`;
  },
  model: (s) => s.verdict,
};
