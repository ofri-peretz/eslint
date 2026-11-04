const { tag } = require('../../lib.cjs');

const VIEW = {
  LitView: () => "'post'",
  QueryView: (q) => `${q}.query.view`,
  TemplateView: (q) => `\`pages/\${${q}.params.name}\``,
  ConcatView: (q) => `'pages/' + ${q}.query.p`,
  MapView: (q) => `VIEWS[${q}.query.tab] ?? 'pages/home'`,
};
const LOCALS = {
  NoLocals: () => '',
  Static: () => "{ title: 'Welcome' }",
  FieldPick: (q) =>
    `{ title: String(${q}.body.title || ''), body: String(${q}.body.body || '') }`,
  WholeBody: (q) => `${q}.body`,
  WholeParams: (q) => `${q}.params`,
  QuerySpread: (q) => `{ ...${q}.query, generatedAt: Date.now() }`,
  Alias: () => 'locals',
  Destructured: () => 'body',
  Assign: (q) => `Object.assign({}, ${q}.body)`,
  Transform: (q) => `transform(${q}.body)`,
  Pick: (q) => `pick(${q}.body, ['title', 'body'])`,
};
const NAMES = {
  ReqRes: ['req', 'res'],
  RequestResponse: ['request', 'response'],
};

module.exports = {
  rule: 'no-user-controlled-render-locals',
  // (11 locals with a literal view + 4 views x 2 locals) x 2 names x 4 mounts x 2 opts
  domain: 19 * 16,
  traces: 5000,
  key: (s) =>
    ['view', 'locals', 'names', 'mount', 'opts']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    tag(s.opts) === 'Sanitizers' ? { allowSanitizers: ['pick'] } : undefined,
  code: (s) => {
    const [q, r] = NAMES[tag(s.names)];
    const l = tag(s.locals);
    const args = [VIEW[tag(s.view)](q), LOCALS[l](q)].filter(Boolean);
    const [head, decl, recv] = {
      App: ["import express from 'express';", 'const app = express();', 'app'],
      Router: [
        "import express from 'express';",
        'const router = express.Router();',
        'router',
      ],
      RequireApp: [
        "const express = require('express');",
        'const app = express();',
        'app',
      ],
      NoExpress: [
        "import { createServer } from './http';",
        'const app: any = createServer();',
        'app',
      ],
    }[tag(s.mount)];
    return [
      head,
      "import { pick, transform } from './helpers';",
      decl,
      "const VIEWS: Record<string, string> = { news: 'pages/news' };",
      `${recv}.post('/preview', (${q}: any, ${r}: any) => {`,
      l === 'Alias' ? `  const locals = ${q}.body;` : '',
      l === 'Destructured' ? `  const { body } = ${q};` : '',
      `  ${r}.render(${args.join(', ')});`,
      '});',
      '',
    ].join('\n');
  },
};
