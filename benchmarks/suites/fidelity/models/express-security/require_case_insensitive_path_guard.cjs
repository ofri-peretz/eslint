const { tag } = require('../../lib.cjs');

const SEG = { Admin: 'admin', Health: 'health', Billing: 'billing' };
const GUARD = {
  StartsWith: (p, v) => [`if (${p}.startsWith('/${v}')) requireAuth(req);`],
  EndsWith: (p, v) => [`if (${p}.endsWith('/${v}')) requireAuth(req);`],
  Includes: (p, v) => [`if (${p}.includes('/${v}')) requireAuth(req);`],
  IndexOf: (p, v) => [`if (${p}.indexOf('/${v}') === 0) requireAuth(req);`],
  Match: (p, v) => [`if (${p}.match(/^\\/${v}/)) requireAuth(req);`],
  RegexTest: (p, v) => [`if (/^\\/${v}/.test(${p})) requireAuth(req);`],
  Eq: (p, v) => [`if (${p} === '/${v}') requireAuth(req);`],
  LooseNe: (p, v) => [
    `if (${p} != '/${v}') return next();`,
    'requireAuth(req);',
  ],
  YodaEq: (p, v) => [`if ('/${v}' === ${p}) requireAuth(req);`],
  MatchI: (p, v) => [`if (${p}.match(/^\\/${v}/i)) requireAuth(req);`],
  TestI: (p, v) => [`if (/^\\/${v}/i.test(${p})) requireAuth(req);`],
  LowerInline: (p, v) => [
    `if (${p}.toLowerCase().startsWith('/${v}')) requireAuth(req);`,
  ],
  LowerVar: (p, v) => [
    `const normalizedPath = ${p}.toLowerCase();`,
    `if (normalizedPath.startsWith('/${v}')) requireAuth(req);`,
  ],
};
const PROP = { Path: 'path', Url: 'url', OriginalUrl: 'originalUrl' };

module.exports = {
  rule: 'require-case-insensitive-path-guard',
  // 14 guards x 3 sources x 3 values x 3 opts, + StartsWith/Path x 4 more mounts x 9
  domain: 378 + 36,
  traces: 6000,
  key: (s) =>
    ['guard', 'source', 'value', 'opts', 'mount']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    ({
      Prot: { protectedPaths: ['admin', 'billing'] },
      CheckAll: { checkAllPaths: true },
    })[tag(s.opts)],
  code: (s) => {
    const g = tag(s.guard);
    const v = SEG[tag(s.value)];
    const m = tag(s.mount);
    const head = {
      App: ["import express from 'express';", 'const app = express();'],
      Router: ["import { Router } from 'express';", 'const app = Router();'],
      RequireApp: [
        "const express = require('express');",
        'const app = express();',
      ],
      TypedModule: [
        "import type { Request, Response, NextFunction } from 'express';",
      ],
      PlainModule: ["import { createServer } from './http';"],
    }[m];
    const fn =
      m === 'TypedModule'
        ? '(req: Request, res: Response, next: NextFunction)'
        : '(req: any, res: any, next: any)';
    const body =
      g === 'Registration'
        ? [`app.get('/${v}', requireAuth, adminHandler);`]
        : [
            m === 'TypedModule' || m === 'PlainModule'
              ? `export function guard${fn} {`
              : `app.use(${fn} => {`,
            ...GUARD[g](`req.${PROP[tag(s.source)]}`, v).map((l) => `  ${l}`),
            '  next();',
            m === 'TypedModule' || m === 'PlainModule' ? '}' : '});',
          ];
    return [
      ...head,
      "import { requireAuth, adminHandler } from './auth';",
      ...body,
      '',
    ].join('\n');
  },
};
