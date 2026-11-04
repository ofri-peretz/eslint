const { tag, withTestFile } = require('../../lib.cjs');

const SPELL = {
  ImportDefault: ["import express from 'express';", 'express()', 'app'],
  Require: ["const express = require('express');", 'express()', 'app'],
  RenamedExpress: ["import createApp from 'express';", 'createApp()', 'app'],
  ServerName: ["import express from 'express';", 'express()', 'server'],
};

const EVIDENCE = {
  NoDoc: (a) => [`${a}.get('/health', (req, res) => res.json({ ok: true }));`],
  Render: (a) => [`${a}.get('/', (req, res) => res.render('home'));`],
  SendFile: (a) => [
    `${a}.get('/', (req, res) => res.sendFile('/srv/www/index.html'));`,
  ],
  ViewEngine: (a) => [
    `${a}.set('view engine', 'pug');`,
    `${a}.get('/health', (req, res) => res.json({ ok: true }));`,
  ],
  Engine: (a) => [
    `${a}.engine('html', renderHtml);`,
    `${a}.get('/health', (req, res) => res.json({ ok: true }));`,
  ],
  SendOnly: (a) => [`${a}.get('/', (req, res) => res.send('<h1>hi</h1>'));`],
  StaticOnly: (a) => [`${a}.use(express.static('./public'));`],
};

const HELMET = {
  NoHelmet: () => [[], []],
  HelmetUse: (a) => [["import helmet from 'helmet';"], [`${a}.use(helmet());`]],
  HelmetRenamed: (a) => [
    ["import securityHeaders from 'helmet';"],
    [`${a}.use(securityHeaders());`],
  ],
  HelmetArray: (a) => [
    ["import helmet from 'helmet';", "import compression from 'compression';"],
    [`${a}.use([compression(), helmet()]);`],
  ],
  AltNamed: (a) => [
    ["import { secureHeaders } from './security';"],
    [`${a}.use(secureHeaders());`],
  ],
  AltUnnamed: (a) => [
    ["import { secureHeaders } from './security';"],
    [`${a}.use(secureHeaders());`],
  ],
};

const ESCAPE = {
  Stays: (a) => [`${a}.listen(3000);`],
  CjsExport: (a) => [`module.exports = ${a};`],
  EsmExport: (a) => [`export default ${a};`],
  PassedToFn: (a) => [`setAppConfigurations(${a});`, `${a}.listen(3000);`],
};

const base = {
  rule: 'require-helmet',
  // 7 evidence x 6 helmet, of which 2 x 2 are crossed with
  // 4 spellings x 4 escapes x 2 assume: 38 + 4 * 32
  domain: 38 + 128,
  traces: 4000,
  key: (s) =>
    ['evidence', 'helmet', 'spelling', 'escape', 'assumeHelmet']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => ({
    ...(tag(s.helmet) === 'AltNamed'
      ? { alternativeMiddleware: ['secureHeaders'] }
      : {}),
    ...(s.assumeHelmet ? { assumeHelmetMiddleware: true } : {}),
  }),
  code: (s) => {
    const [imp, ctor, a] = SPELL[tag(s.spelling)];
    const [hImports, hUse] = HELMET[tag(s.helmet)](a);
    return [
      imp,
      ...hImports,
      "import { renderHtml, setAppConfigurations } from './lib';",
      `const ${a} = ${ctor};`,
      ...hUse,
      ...EVIDENCE[tag(s.evidence)](a),
      ...ESCAPE[tag(s.escape)](a),
      '',
    ].join('\n');
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
