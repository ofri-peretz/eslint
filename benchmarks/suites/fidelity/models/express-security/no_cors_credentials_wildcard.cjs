const { tag, withTestFile } = require('../../lib.cjs');

const ORIGIN = {
  Star: "origin: '*'",
  ReflectTrue: 'origin: true',
  OriginString: "origin: 'https://app.example.com'",
  OriginArray:
    "origin: ['https://app.example.com', 'https://admin.example.com']",
  OriginRegex: 'origin: /\\.example\\.com$/',
  OriginCallback: 'origin: (o, cb) => cb(null, allowed.includes(o))',
  OriginEnv: 'origin: process.env.CORS_ORIGIN',
  OriginFalse: 'origin: false',
  NoOrigin: '',
};
const CRED = {
  CredTrue: 'credentials: true',
  CredFalse: 'credentials: false',
  NoCred: '',
};
const IMPORT = {
  DefaultImport: ["import express from 'express';", "import cors from 'cors';"],
  RequireCors: [
    "const express = require('express');",
    "const cors = require('cors');",
  ],
  RenamedImport: [
    "import express from 'express';",
    "import corsMiddleware from 'cors';",
  ],
};
const MOUNT = {
  AppUse: (mw) => [`app.use(${mw});`],
  RouterUse: (mw) => [
    'const router = express.Router();',
    `router.use(${mw});`,
    "app.use('/api', router);",
  ],
  RouteLevel: (mw) => [
    `app.get('/api/me', ${mw}, (req, res) => res.json({}));`,
  ],
  OptionsPreflight: (mw) => [`app.options('*', ${mw});`],
  MiddlewareArray: (mw) => [`app.use([express.json(), ${mw}]);`],
};

const base = {
  rule: 'no-cors-credentials-wildcard',
  // 9 origins x 3 creds, of which 2 are crossed with 3 imports x 5 mounts.
  domain: 25 + 2 * 15,
  traces: 1500,
  key: (s) =>
    ['origin', 'cred', 'imp', 'mount']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  code: (s) => {
    const fn = tag(s.imp) === 'RenamedImport' ? 'corsMiddleware' : 'cors';
    const props = [ORIGIN[tag(s.origin)], CRED[tag(s.cred)]].filter(Boolean);
    const mw = `${fn}({ ${props.join(', ')} })`;
    return [
      ...IMPORT[tag(s.imp)],
      "import { allowed } from './config';",
      'const app = express();',
      ...MOUNT[tag(s.mount)](mw),
      'app.listen(3000);',
      '',
    ].join('\n');
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
