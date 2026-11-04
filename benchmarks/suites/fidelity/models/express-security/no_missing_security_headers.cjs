const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'no-missing-security-headers',
  domain: 264, // 2^3 header subsets x 3 extras x 11 contexts
  traces: 4000,
  key: (s) =>
    `csp=${s.csp} xfo=${s.xfo} xcto=${s.xcto} extra=${tag(s.extra)} ctx=${tag(s.ctx)}`,
  config: (s) =>
    ({
      TestFlip: { ignoreInTests: false },
      XfoOnly: { requiredHeaders: ['X-Frame-Options'] },
    })[tag(s.ctx)],
  filename: (s) =>
    ['TestDefault', 'TestFlip'].includes(tag(s.ctx))
      ? 'src/server.test.ts'
      : 'src/server.ts',
  code: (s) => {
    const ctx = tag(s.ctx);
    const headers = [];
    if (s.csp) headers.push(['Content-Security-Policy', "default-src 'self'"]);
    if (s.xfo) headers.push(['X-Frame-Options', 'DENY']);
    if (s.xcto) headers.push(['X-Content-Type-Options', 'nosniff']);
    if (tag(s.extra) === 'ContentType')
      headers.push(['Content-Type', 'text/html; charset=utf-8']);
    if (tag(s.extra) === 'CacheControl')
      headers.push(['Cache-Control', 'no-store']);
    const fn = { DefResSet: 'set', DefResHeader: 'header' }[ctx] ?? 'setHeader';
    let lines;
    if (ctx === 'DefSetObject') {
      lines = headers.length
        ? [
            `res.set({ ${headers.map(([n, v]) => `'${n}': "${v}"`).join(', ')} });`,
          ]
        : [];
    } else {
      lines = headers.map(
        ([n, v]) =>
          `res.${fn}('${ctx === 'DefLower' ? n.toLowerCase() : n}', "${v}");`,
      );
    }
    lines.push(ctx === 'DefNoExpress' ? 'res.end(page);' : 'res.send(page);');
    const body = lines.map((l) => `  ${l}`);
    if (ctx === 'DefNoExpress') {
      return [
        "import http from 'node:http';",
        "import { page } from './page';",
        'http.createServer((req: any, res: any) => {',
        ...body,
        '}).listen(3000);',
        '',
      ].join('\n');
    }
    return [
      ctx === 'DefRequire'
        ? "const express = require('express');"
        : "import express from 'express';",
      "import { page } from './page';",
      ctx === 'DefRouter'
        ? 'const app = express.Router();'
        : 'const app = express();',
      "app.get('/', (req: any, res: any) => {",
      ...body,
      '});',
      '',
    ].join('\n');
  },
};
