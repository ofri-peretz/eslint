const { tag } = require('../../lib.cjs');

const FLAG = { FTrue: 'true', FFalse: 'false' };
const SAME = {
  SStrict: "'strict'",
  SLax: "'lax'",
  SNone: "'none'",
  STrue: 'true',
};

module.exports = {
  rule: 'no-insecure-cookie-options',
  domain: 611, // (45 literals + no options + spread) x 13 contexts
  traces: 7000,
  key: (s) =>
    ['opts', 'httpOnly', 'secure', 'sameSite', 'ctx']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    ({
      CfgNoHttpOnly: { requireHttpOnly: false },
      CfgNoSecure: { requireSecure: false },
      CfgNoSameSite: { requireSameSite: false },
      CfgStrictOnly: { acceptableSameSiteValues: ['strict'] },
      FlipTestFile: { allowInTests: true },
    })[tag(s.ctx)],
  filename: (s) =>
    ['DefTestFile', 'FlipTestFile'].includes(tag(s.ctx))
      ? 'src/session.test.ts'
      : 'src/session.ts',
  code: (s) => {
    const ctx = tag(s.ctx);
    const res = ctx === 'DefEsmResponse' ? 'response' : 'res';
    const head =
      {
        DefCjsRes: "const express = require('express');",
        DefNoExpress: "import Koa from 'koa';",
      }[ctx] ?? "import express from 'express';";
    const app =
      {
        DefNoExpress: 'const app: any = new Koa();',
        DefRouter: 'const app = express.Router();',
      }[ctx] ?? 'const app = express();';
    const call =
      {
        DefChained: `${res}.status(200).cookie`,
        DefBracket: `${res}['cookie']`,
      }[ctx] ?? `${res}.cookie`;
    let args = 'token';
    const o = tag(s.opts);
    if (o === 'Spread') args += ', { ...cookieDefaults }';
    if (o === 'Lit') {
      const props = [
        FLAG[tag(s.httpOnly)] && `httpOnly: ${FLAG[tag(s.httpOnly)]}`,
        FLAG[tag(s.secure)] && `secure: ${FLAG[tag(s.secure)]}`,
        SAME[tag(s.sameSite)] && `sameSite: ${SAME[tag(s.sameSite)]}`,
        'maxAge: 3600000',
      ].filter(Boolean);
      args += `, { ${props.join(', ')} }`;
    }
    return [
      head,
      "import { cookieDefaults, token } from './config';",
      app,
      `app.post('/login', (req: any, ${res}: any) => {`,
      `  ${call}('session', ${args});`,
      `  ${res}.end();`,
      '});',
      '',
    ].join('\n');
  },
};
