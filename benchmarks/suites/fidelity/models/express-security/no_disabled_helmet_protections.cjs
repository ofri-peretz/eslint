const { tag } = require('../../lib.cjs');

const OPT = {
  Csp: 'contentSecurityPolicy',
  Frameguard: 'frameguard',
  XFrameOptions: 'xFrameOptions',
  NoSniff: 'noSniff',
  XContentTypeOptions: 'xContentTypeOptions',
  ReferrerPolicy: 'referrerPolicy',
  HidePoweredBy: 'hidePoweredBy',
  XPoweredBy: 'xPoweredBy',
  Corp: 'crossOriginResourcePolicy',
  Coop: 'crossOriginOpenerPolicy',
  Hsts: 'hsts',
  DnsPrefetch: 'dnsPrefetchControl',
};
const VAL = {
  False: 'false',
  ObjectCfg: '{}',
  True: 'true',
  EnvExpr: "process.env.NODE_ENV !== 'production'",
};
const IMPORT = {
  DefaultImport: [
    "import express from 'express';",
    "import helmet from 'helmet';",
  ],
  RequireHelmet: [
    "const express = require('express');",
    "const helmet = require('helmet');",
  ],
  RenamedImport: [
    "import express from 'express';",
    "import securityHeaders from 'helmet';",
  ],
};
const MOUNT = {
  AppUse: (mw) => [`app.use(${mw});`],
  RouterUse: (mw) => [
    'const router = express.Router();',
    `router.use(${mw});`,
    'app.use(router);',
  ],
  MiddlewareArray: (mw) => [`app.use([express.json(), ${mw}]);`],
};

module.exports = {
  rule: 'no-disabled-helmet-protections',
  // 12 opts x 4 vals; 2 of them crossed with 2 keys x 2 allow x 3 imports x 3 mounts.
  domain: 46 + 2 * 36,
  traces: 6000,
  key: (s) =>
    ['opt', 'value', 'keySpell', 'allowCsp', 'imp', 'mount']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    s.allowCsp ? { allowDisabled: ['contentSecurityPolicy'] } : undefined,
  code: (s) => {
    const name = OPT[tag(s.opt)];
    const key = tag(s.keySpell) === 'StringKey' ? `'${name}'` : name;
    const fn = tag(s.imp) === 'RenamedImport' ? 'securityHeaders' : 'helmet';
    const mw = `${fn}({ ${key}: ${VAL[tag(s.value)]} })`;
    return [
      ...IMPORT[tag(s.imp)],
      'const app = express();',
      ...MOUNT[tag(s.mount)](mw),
      'app.listen(3000);',
      '',
    ].join('\n');
  },
};
