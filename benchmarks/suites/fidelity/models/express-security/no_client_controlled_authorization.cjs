const { tag } = require('../../lib.cjs');

const CONTAINER = {
  Body: 'body',
  Query: 'query',
  Params: 'params',
  Cookies: 'cookies',
  Headers: 'headers',
  User: 'user',
  Session: 'session',
};
const ATTR = {
  Role: 'role',
  IsAdmin: 'isAdmin',
  UserId: 'user_id',
  Page: 'page',
  Tier: 'tier',
};
const HEADER = {
  Role: 'x-user-role',
  UserId: 'x-tenant-id',
  Page: 'content-type',
};
const POS = {
  Eq: (e) => `if (${e} === 'admin') { grant(); }`,
  IfTruthy: (e) => `if (${e}) { grant(); }`,
  Not: (e) => `if (!${e}) { return res.sendStatus(403); }`,
  AndOr: (e) => `const ok = ${e} && enabled;`,
  Ternary: (e) => `const level = ${e} ? 1 : 0;`,
  Switch: (e) => `switch (${e}) { case 'admin': grant(); break; }`,
  IncludesRecv: (e) => `const ok = ${e}.includes('admin');`,
  IncludesArg: (e) => `const ok = ADMIN_ROLES.includes(${e});`,
  Nullish: (e) => `const requested = ${e} ?? 'viewer';`,
  Assign: (e) => `const value = ${e};`,
  Json: (e) => `res.json({ value: ${e} });`,
};

module.exports = {
  rule: 'no-client-controlled-authorization',
  // Eq: 6 containers x 5 attrs x 2 spellings x 2 + headers 3 attrs x 3
  // spellings x 2; 10 other positions x 2 containers x 2 attrs; +5 evidence
  // variants x 2 containers (body/user role), the default one already counted.
  domain: 120 + 18 + 40 + 10,
  traces: 16000,
  key: (s) =>
    ['container', 'attr', 'pos', 'spell', 'extra', 'evidence']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => (s.extra ? { extraProperties: ['tier'] } : undefined),
  code: (s) => {
    const c = tag(s.container);
    const a = tag(s.attr);
    const base = `req.${CONTAINER[c]}`;
    const sp = tag(s.spell);
    const e =
      c === 'Headers'
        ? sp === 'GetFn'
          ? `req.get('${HEADER[a]}')`
          : sp === 'HeaderFn'
            ? `req.header('${HEADER[a]}')`
            : `${base}['${HEADER[a]}']`
        : sp === 'Dot'
          ? `${base}.${ATTR[a]}`
          : `${base}['${ATTR[a]}']`;
    const body = [`  ${POS[tag(s.pos)](e)}`, '  res.sendStatus(200);'];
    // A literal-path `(req, res)` registration is itself Express evidence
    // (#1616: route modules receive `app` from their caller and import nothing),
    // so the no-Express fixture registers on an imported path constant.
    const route = (r, path = "'/admin/action'") => [
      `${r}.post(${path}, (req, res) => {`,
      ...body,
      '});',
    ];
    const EVIDENCE = {
      DefaultImport: () => [
        "import express from 'express';",
        'const app = express();',
        ...route('app'),
      ],
      Require: () => [
        "const express = require('express');",
        'const app = express();',
        ...route('app'),
      ],
      RouterNamed: () => [
        "import { Router as makeRouter } from 'express';",
        'const router = makeRouter();',
        ...route('router'),
      ],
      TypeOnly: () => [
        "import type { Request, Response } from 'express';",
        'export function handle(req: Request, res: Response) {',
        ...body,
        '}',
      ],
      NoExpress: () => [
        "import { app } from './server';",
        "import { ADMIN_ACTION } from './paths';",
        ...route('app', 'ADMIN_ACTION'),
      ],
      // The NodeGoat shape: no import, `app` handed in by the caller, handler
      // registered on a literal path.
      RouteModule: () => [
        'module.exports = (app) => {',
        ...route('app').map((l) => `  ${l}`),
        '};',
      ],
    };
    return [...EVIDENCE[tag(s.evidence)](), ''].join('\n');
  },
};
