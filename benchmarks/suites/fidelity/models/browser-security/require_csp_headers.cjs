const { tag } = require('../../lib.cjs');

// [response parameter name, emission statement]
const CALLS = {
  ResSendDoc: [
    'res',
    "res.send('<!DOCTYPE html><html><body><h1>Hello</h1></body></html>');",
  ],
  ResSendFragment: ['res', 'res.send(\'<div class="greeting">Hello</div>\');'],
  ResSendJson: ['res', "res.send({ data: 'json' });"],
  ResSendPlain: ['res', "res.send('ok');"],
  ResRender: ['res', "res.render('index', { title: 'Home' });"],
  ResponseRender: ['response', "response.render('index', { title: 'Home' });"],
  ReplyRender: ['reply', "reply.render('index', { title: 'Home' });"],
  EngineRender: [
    'res',
    "const html = nunjucksEnv.render('index.njk', { title: 'Home' });",
  ],
  CustomRecvRender: ['httpRes', "httpRes.render('index', { title: 'Home' });"],
};

module.exports = {
  domain: 576, // 9 calls x 4 helmet states x 4 header states x test file x responseReceivers
  traces: 8000,
  rule: 'require-csp-headers',
  key: (s) =>
    `${tag(s.call)}|${tag(s.helmet)}|${tag(s.csp)}|test=${s.testFile}|custom=${s.customRecv}`,
  config: (s) =>
    s.customRecv
      ? { responseReceivers: ['res', 'response', 'reply', 'httpRes'] }
      : undefined,
  filename: (s) => (s.testFile ? 'src/server.test.ts' : 'src/server.ts'),
  code: (s) => {
    const [r, emit] = CALLS[tag(s.call)];
    const csp = tag(s.csp);
    const header = {
      NoCsp: '',
      SetHeaderCsp: `${r}.setHeader('Content-Security-Policy', "default-src 'self'");\n  `,
      SetCsp: `${r}.set('Content-Security-Policy', "default-src 'self'");\n  `,
      SetHeaderOther: `${r}.setHeader('X-Frame-Options', 'DENY');\n  `,
    }[csp];
    return [
      "import express from 'express';",
      tag(s.helmet) === 'NoHelmet' ? '' : "import helmet from 'helmet';",
      'declare const nunjucksEnv: any;',
      'const app = express();',
      {
        NoHelmet: '',
        HelmetImportOnly: '',
        HelmetUse: 'app.use(helmet());',
        HelmetCspDisabled: 'app.use(helmet({ contentSecurityPolicy: false }));',
      }[tag(s.helmet)],
      `app.get('/', (req: any, ${r}: any) => {\n  ${header}${emit}\n});`,
      '',
    ].join('\n');
  },
  model: (s) => s.verdict,
};
