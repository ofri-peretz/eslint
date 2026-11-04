const { tag } = require('../../lib.cjs');

const BODY = {
  QueryDot: (q, r) => [`${r}.redirect(${q}.query.returnTo);`],
  QueryBracket: (q, r) => [`${r}.redirect(${q}.query['returnTo']);`],
  Body: (q, r) => [`${r}.redirect(${q}.body.next);`],
  Params: (q, r) => [`${r}.redirect(${q}.params.target);`],
  StatusQuery: (q, r) => [`${r}.redirect(302, ${q}.query.returnTo);`],
  Literal: (q, r) => [`${r}.redirect('/dashboard');`],
  StatusLiteral: (q, r) => [`${r}.redirect(301, '/login');`],
  AllowMap: (q, r) => [`${r}.redirect(ALLOWED.get(${q}.query.to) ?? '/');`],
  SameGuard: (q, r) => [
    `if (new URL(${q}.query['a']).host !== 'example.com') return ${r}.sendStatus(400);`,
    `${r}.redirect(${q}.query['a']);`,
  ],
  OtherGuard: (q, r) => [
    `if (new URL(${q}.query['a']).host !== 'example.com') return ${r}.sendStatus(400);`,
    `${r}.redirect(${q}.query['b']);`,
  ],
};
const NAMES = {
  ReqRes: ['req', 'res'],
  RequestResponse: ['request', 'response'],
  Short: ['q', 'r'],
};

module.exports = {
  rule: 'no-user-controlled-redirect',
  domain: 240, // 10 targets x 3 names x 4 mounts x 2 opts
  traces: 3000,
  key: (s) =>
    ['target', 'names', 'mount', 'opts']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    tag(s.opts) === 'Extra'
      ? { responseObjects: ['r'], requestObjects: ['q'] }
      : undefined,
  code: (s) => {
    const [q, r] = NAMES[tag(s.names)];
    const [head, decl, recv] = {
      App: ["import express from 'express';", 'const app = express();', 'app'],
      Router: [
        "import { Router } from 'express';",
        'const router = Router();',
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
      decl,
      "const ALLOWED = new Map([['docs', '/docs'], ['home', '/']]);",
      `${recv}.get('/go', (${q}: any, ${r}: any) => {`,
      ...BODY[tag(s.target)](q, r).map((l) => `  ${l}`),
      '});',
      '',
    ].join('\n');
  },
};
