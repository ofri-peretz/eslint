const { tag } = require('../../lib.cjs');

const READ = {
  HostDot: 'req.headers.host',
  HostBracket: "req.headers['host']",
  XFwdHost: "req.headers['x-forwarded-host']",
  GetHost: "req.get('host')",
  HeaderFnHost: "req.header('host')",
  Hostname: 'req.hostname',
  EnvOrigin: 'process.env.PUBLIC_ORIGIN',
  UserAgent: "req.headers['user-agent']",
};
const BUILD = {
  ConcatScheme: (h) =>
    `const url = 'https://' + ${h} + '/reset?token=' + token;`,
  TemplateScheme: (h) =>
    `const url = \`https://\${${h}}/verify?code=\${token}\`;`,
  ProtoRelative: (h) => `const url = '//' + ${h} + '/reset?token=' + token;`,
  MailArg: (h) =>
    `await mailer.sendMail({ to: email, text: 'Recover here: ' + ${h} + '/recover/' + token });`,
  CustomMail: (h) =>
    `await deliver(email, 'Recover here: ' + ${h} + '/recover/' + token);`,
  LogOnly: (h) => `console.log('incoming host: ' + ${h});`,
  PlainCopy: (h) => `const seen = ${h};`,
};

module.exports = {
  rule: 'no-host-header-in-links',
  // Reads 8; Builds 7 (+1: CustomMail x deliver option); Flows 2 x 2 x 2; Guards 3 x 2.
  domain: 8 + 8 + 8 + 6,
  traces: 2000,
  key: (s) =>
    ['focus', 'read', 'build', 'flow', 'guard', 'deliverOpt', 'allowOpt']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => {
    const o = {};
    if (s.deliverOpt) o.checkMailCallees = ['sendMail', 'send', 'deliver'];
    if (s.allowOpt) o.allowedHosts = ['app.example.com'];
    return Object.keys(o).length ? o : undefined;
  },
  code: (s) => {
    const read = READ[tag(s.read)];
    const via = tag(s.flow) === 'ViaVariable';
    const h = via ? 'host' : read;
    const stmt = BUILD[tag(s.build)](h);
    const guard = tag(s.guard);
    const body =
      guard === 'NoIf'
        ? [stmt]
        : [
            `if (host === '${guard === 'IfAllowed' ? 'app.example.com' : 'staging.example.com'}') {`,
            `  ${stmt}`,
            '}',
          ];
    return [
      "import express from 'express';",
      "import { mailer, deliver } from './mail';",
      'const app = express();',
      "app.post('/forgot', async (req, res) => {",
      '  const { email, token } = req.body;',
      ...(via ? [`  const host = ${read};`] : []),
      ...body.map((l) => `  ${l}`),
      '  res.sendStatus(204);',
      '});',
      '',
    ].join('\n');
  },
};
