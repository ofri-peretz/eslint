const { tag } = require('../../lib.cjs');

const ACAO = "'Access-Control-Allow-Origin'";
const SINK = {
  CorsNoArg: ['cors()'],
  CorsStar: ["cors({ origin: '*' })"],
  CorsTrue: ['cors({ origin: true })'],
  CorsList: ["cors({ origin: ['https://app.example.com'] })"],
  CorsString: ["cors({ origin: 'https://app.example.com' })"],
  CorsCallback: [
    'cors({ origin: (origin: any, cb: any) => cb(null, allowedOrigins.includes(origin)) })',
  ],
  HdrSetHeaderStar: [`res.setHeader(${ACAO}, '*');`],
  HdrHeaderStar: [`res.header(${ACAO}, '*');`],
  HdrSetStar: [`res.set(${ACAO}, '*');`],
  HdrReflect: [`res.setHeader(${ACAO}, req.headers.origin);`],
  HdrValidated: [
    'const origin = req.headers.origin;',
    'if (allowedOrigins.includes(origin)) {',
    `  res.setHeader(${ACAO}, origin);`,
    '}',
  ],
  HdrFixed: [`res.setHeader(${ACAO}, 'https://app.example.com');`],
};

module.exports = {
  rule: 'no-missing-cors-check',
  domain: 96, // 12 sinks x 8 contexts
  traces: 1500,
  key: (s) => `sink=${tag(s.sink)} ctx=${tag(s.ctx)}`,
  config: (s) =>
    ({
      FlipTestFile: { allowInTests: true },
      CfgTrustCors: { trustedLibraries: ['cors'] },
      CfgIgnoreStar: { ignorePatterns: ['\\*'] },
    })[tag(s.ctx)],
  filename: (s) =>
    ['DefTestFile', 'FlipTestFile'].includes(tag(s.ctx))
      ? 'src/server.test.ts'
      : 'src/server.ts',
  code: (s) => {
    const ctx = tag(s.ctx);
    const sink = tag(s.sink);
    const head = {
      DefRequire: [
        "const express = require('express');",
        "const cors = require('cors');",
      ],
      DefNoExpress: [
        "import http from 'node:http';",
        "import cors from 'cors';",
      ],
    }[ctx] ?? ["import express from 'express';", "import cors from 'cors';"];
    const recv =
      ctx === 'DefNoExpress'
        ? 'const app: any = { use: (...a: unknown[]) => a };'
        : ctx === 'DefRouter'
          ? 'const app = express.Router();'
          : 'const app = express();';
    const lines = SINK[sink];
    // Without Express the header is written from a plain node:http handler
    // (two parameters: not the Connect middleware signature).
    const body = sink.startsWith('Cors')
      ? [`app.use(${lines[0]});`]
      : ctx === 'DefNoExpress'
        ? [
            'http.createServer((req: any, res: any) => {',
            ...lines.map((l) => `  ${l}`),
            '  res.end();',
            '});',
          ]
        : [
            'app.use((req: any, res: any, next: any) => {',
            ...lines.map((l) => `  ${l}`),
            '  next();',
            '});',
          ];
    return [
      ...head,
      "import { allowedOrigins } from './config';",
      recv,
      ...body,
      '',
    ].join('\n');
  },
};
