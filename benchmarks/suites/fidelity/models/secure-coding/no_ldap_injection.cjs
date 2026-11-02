const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 72,
  traces: 600,
  rule: 'no-ldap-injection',
  key: (s) =>
    `${tag(s.gate)}|${tag(s.build)}|${tag(s.wrap)}|${tag(s.value)}|${tag(s.use)}`,
  config: () => ({}),
  code: (s) => {
    const head = {
      Ldapjs:
        "const ldap = require('ldapjs');\nconst client = ldap.createClient({ url: 'ldap://x' });",
      Ldapts:
        "import { Client } from 'ldapts';\nconst client = new Client({ url: 'ldap://x' });",
      NoLdap: 'declare const client: any;',
    }[tag(s.gate)];
    const raw = tag(s.value) === 'ReqBody' ? 'req.body.user' : 'username';
    const v = tag(s.wrap) === 'Escaped' ? `filterEscape(${raw})` : raw;
    const filter = {
      Template: '`(&(objectClass=user)(uid=${' + v + '}))`',
      Concat: `'(&(objectClass=user)(uid=' + ${v} + '))'`,
      Const: "'(&(objectClass=user)(uid=admin))'",
    }[tag(s.build)];
    const body =
      tag(s.use) === 'Inline'
        ? `return client.search('ou=users,dc=example,dc=com', { filter: ${filter} });`
        : `const filter = ${filter};\n  return client.search('ou=users,dc=example,dc=com', { filter });`;
    return `${head}\ndeclare function filterEscape(v: string): string;\nexport function find(req: any, username: string) {\n  ${body}\n}\n`;
  },
};
