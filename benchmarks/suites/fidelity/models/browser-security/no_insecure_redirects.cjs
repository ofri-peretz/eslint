const { tag } = require('../../lib.cjs');

let current = null;

const VALUES = {
  UrlParam: "new URLSearchParams(location.search).get('next')",
  UrlParamNonNull: "new URLSearchParams(location.search).get('next')!",
  ReqQuery: 'req.query.next',
  LocHash: 'location.hash.slice(1)',
  TplUserHost:
    "`https://${new URLSearchParams(location.search).get('host')}/home`",
  TplFixedOrigin: '`https://app.example.com/profile/${req.query.id}`',
  LiteralRelative: "'/dashboard'",
  LiteralAllowed: "'https://trusted.example.com/home'",
};

module.exports = {
  domain: 768, // 12 sinks x 8 values x test file x ignoreInTests x allowedDomains
  traces: 10000,
  rule: 'no-insecure-redirects',
  key: (s) =>
    `${tag(s.sink)}|${tag(s.value)}|test=${s.testFile}|ignore=${s.ignoreInTests}|allow=${s.allowOpt}`,
  config: (s) => ({
    ignoreInTests: s.ignoreInTests,
    allowedDomains: s.allowOpt ? ['trusted.example.com'] : [],
  }),
  get filename() {
    return current && current.testFile
      ? 'src/redirect.test.ts'
      : 'src/redirect.ts';
  },
  code: (s) => {
    current = s;
    const v = VALUES[tag(s.value)];
    const stmt = {
      WindowLocHref: `window.location.href = ${v};`,
      LocHref: `location.href = ${v};`,
      LocAssignEq: `location = ${v};`,
      WindowLocEq: `window.location = ${v};`,
      TopLocHref: `top.location.href = ${v};`,
      WindowBracketLocHref: `window['location'].href = ${v};`,
      DocLocHref: `document.location.href = ${v};`,
      LocAssignCall: `location.assign(${v});`,
      WindowLocReplace: `window.location.replace(${v});`,
      ResRedirect: `res.redirect(${v});`,
      WindowOpen: `window.open(${v});`,
      RouterPush: `router.push(${v});`,
    }[tag(s.sink)];
    return `declare const req: any;\ndeclare const res: any;\ndeclare const router: any;\nexport function go() {\n  ${stmt}\n}\n`;
  },
  model: (s) => s.verdict,
};
