const { tag } = require('../../lib.cjs');

const DIRECTIVE = {
  ScriptSrc: 'scriptSrc',
  ScriptSrcHeader: "'script-src'",
  ScriptSrcElem: 'scriptSrcElem',
  DefaultSrc: 'defaultSrc',
  ObjectSrc: 'objectSrc',
  WorkerSrc: 'workerSrc',
  StyleSrc: 'styleSrc',
  StyleSrcAttr: 'styleSrcAttr',
  ImgSrc: 'imgSrc',
};
const SOURCE = {
  Self: null,
  UnsafeInline: '"\'unsafe-inline\'"',
  UnsafeEval: '"\'unsafe-eval\'"',
  Star: "'*'",
  Data: "'data:'",
  Http: "'http:'",
  Https: "'https:'",
  Nonce: '"\'nonce-r4nd0m\'"',
  Host: "'https://cdn.example.com'",
};

module.exports = {
  rule: 'no-unsafe-csp-directives',
  domain: 602, // (9 directives x 9 sources + 5 framing/upgrade shapes) x 7 contexts
  traces: 12000,
  key: (s) =>
    `d=${tag(s.directive)} src=${tag(s.source)} extra=${tag(s.extra)} ctx=${tag(s.ctx)}`,
  config: (s) =>
    tag(s.ctx) === 'StyleOff' ? { checkStyleSrc: false } : undefined,
  code: (s) => {
    const ctx = tag(s.ctx);
    const extra = tag(s.extra);
    const src = SOURCE[tag(s.source)];
    const directives = [
      `${DIRECTIVE[tag(s.directive)]}: ["'self'"${src ? `, ${src}` : ''}]`,
    ];
    if (extra === 'FrameStar') directives.push("frameAncestors: ['*']");
    if (extra === 'FrameSelf' || extra === 'NoDefaultsWithFrame')
      directives.push('frameAncestors: ["\'self\'"]');
    if (extra === 'UpgradeNull')
      directives.push('upgradeInsecureRequests: null');
    const cspOpts = [
      extra.startsWith('NoDefaults') ? 'useDefaults: false' : '',
      `directives: { ${directives.join(', ')} }`,
    ]
      .filter(Boolean)
      .join(', ');
    const [helmetImport, mw] = {
      HelmetCsp: [
        "import helmet from 'helmet';",
        `helmet.contentSecurityPolicy({ ${cspOpts} })`,
      ],
      Renamed: [
        "import securityHeaders from 'helmet';",
        `securityHeaders({ contentSecurityPolicy: { ${cspOpts} } })`,
      ],
      Require: [
        "const helmet = require('helmet');",
        `helmet({ contentSecurityPolicy: { ${cspOpts} } })`,
      ],
      Named: [
        "import { contentSecurityPolicy } from 'helmet';",
        `contentSecurityPolicy({ ${cspOpts} })`,
      ],
    }[ctx] ?? [
      "import helmet from 'helmet';",
      `helmet({ contentSecurityPolicy: { ${cspOpts} } })`,
    ];
    if (ctx === 'NoExpress') {
      return [
        "import Koa from 'koa';",
        helmetImport,
        'const app: any = new Koa();',
        `app.use(${mw});`,
        '',
      ].join('\n');
    }
    return [
      ctx === 'Require'
        ? "const express = require('express');"
        : "import express from 'express';",
      helmetImport,
      'const app = express();',
      `app.use(${mw});`,
      '',
    ].join('\n');
  },
};
