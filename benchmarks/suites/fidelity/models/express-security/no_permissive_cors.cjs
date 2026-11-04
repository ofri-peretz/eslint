const { tag } = require('../../lib.cjs');

const ARGS = {
  NoArg: '',
  MethodsOnly: "{ methods: ['GET', 'POST'] }",
  CredOnly: '{ credentials: true }',
  OriginStar: "{ origin: '*' }",
  OriginTrue: '{ origin: true }',
  OriginTrueCred: '{ origin: true, credentials: true }',
  OriginFalse: '{ origin: false }',
  OriginList:
    "{ origin: ['https://app.example.com', 'https://admin.example.com'], credentials: true }",
  OriginString: "{ origin: 'https://app.example.com' }",
  OriginCallback:
    '{ origin: (origin: any, cb: any) => cb(null, allowedOrigins.includes(origin)) }',
  OriginEnv: "{ origin: process.env.ALLOWED_ORIGINS?.split(',') || [] }",
};

module.exports = {
  rule: 'no-permissive-cors',
  domain: 121, // 11 args x 11 contexts
  traces: 2000,
  key: (s) => `arg=${tag(s.arg)} ctx=${tag(s.ctx)}`,
  config: (s) =>
    ({
      FlipTestFile: { allowInTests: true },
      CfgAllowTrue: { allowOriginTrue: true },
      CfgAllowedStar: { allowedOrigins: ['*'] },
    })[tag(s.ctx)],
  filename: (s) =>
    ['DefTestFile', 'FlipTestFile'].includes(tag(s.ctx))
      ? 'src/server.test.ts'
      : 'src/server.ts',
  code: (s) => {
    const ctx = tag(s.ctx);
    const name = ctx === 'DefRenamed' ? 'corsMiddleware' : 'cors';
    const head =
      ctx === 'DefRequireUse'
        ? [
            "const express = require('express');",
            "const cors = require('cors');",
          ]
        : ctx === 'DefNoExpress'
          ? ["import http from 'node:http';", "import cors from 'cors';"]
          : ["import express from 'express';", `import ${name} from 'cors';`];
    const call = `${name}(${ARGS[tag(s.arg)]})`;
    const body = {
      DefRouterUse: [
        'const router = express.Router();',
        `router.use(${call});`,
      ],
      DefRouteLevel: [
        'const app = express();',
        `app.get('/api/items', ${call}, (req: any, res: any) => res.json([]));`,
      ],
      DefArray: [
        'const app = express();',
        `app.use([${call}, express.json()]);`,
      ],
      DefNoExpress: [
        `const mw = ${call};`,
        'http.createServer((req, res) => mw(req, res, () => res.end())).listen(3000);',
      ],
    }[ctx] ?? ['const app = express();', `app.use(${call});`];
    return [
      ...head,
      "import { allowedOrigins } from './config';",
      ...body,
      '',
    ].join('\n');
  },
};
