const { tag } = require('../../lib.cjs');

const URLS = {
  UserInfo: 'https://admin:s3cr3t!@example.com/dashboard',
  UserInfoPwWord: 'https://user:password@example.com',
  FtpUserInfo: 'ftp://deploy:hunter2@files.example.com/pub',
  QueryPassword: 'https://example.com/login?user=bob&password=hunter2',
  QueryPwd: 'https://example.com/login?user=bob&pwd=hunter2',
  QueryPasswd: 'https://example.com/login?user=bob&passwd=hunter2',
  FragmentPassword: 'https://example.com/login#password=hunter2',
  UserOnly: 'https://bob@example.com/profile',
  NoCred: 'https://example.com/login?user=bob',
  PathPassword: 'https://example.com/account/password/reset',
  PortOnly: 'https://example.com:8443/api',
  EmailInQuery: 'https://example.com/invite?email=bob@example.org',
};

module.exports = {
  domain: 36, // 12 urls x 3 positions
  traces: 600,
  rule: 'no-password-in-url',
  key: (s) => `${tag(s.url)}|${tag(s.pos)}`,
  config: () => undefined,
  code: (s) => {
    const u = `'${URLS[tag(s.url)]}'`;
    return {
      VarInit: `const target = ${u};\n`,
      FetchArg: `fetch(${u});\n`,
      LocationHref: `window.location.href = ${u};\n`,
    }[tag(s.pos)];
  },
  model: (s) => s.verdict,
};
