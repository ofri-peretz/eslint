const { tag } = require('../../lib.cjs');

const ROOT = {
  Dirname: '__dirname',
  Dot: "'.'",
  DotDot: "'..'",
  Slash: "'/'",
  Cwd: 'process.cwd()',
  JoinDirnameOnly: 'path.join(__dirname)',
  JoinDotDot: "path.join(__dirname, '..', 'shared')",
  JoinVar: 'path.join(__dirname, dir)',
  JoinUploads: "path.join(__dirname, 'uploads')",
  JoinPublic: "path.join(__dirname, 'public')",
  LitPublic: "'public'",
  LitDotSlashPublic: "'./public'",
  JoinCwdAssets: "path.join(process.cwd(), 'assets')",
  ResolvePublic: "path.resolve(__dirname, 'public')",
  JoinWww: "path.join(__dirname, 'www')",
};

module.exports = {
  rule: 'no-static-root-exposure',
  domain: 96, // 16 roots x 6 contexts
  traces: 1500,
  key: (s) => `root=${tag(s.root)} ctx=${tag(s.ctx)}`,
  config: (s) =>
    tag(s.ctx) === 'AllowWww' ? { allowedRoots: ['www'] } : undefined,
  code: (s) => {
    const ctx = tag(s.ctx);
    const r = tag(s.root);
    const head = {
      Cjs: [
        "const express = require('express');",
        "const path = require('path');",
        "const serveIndex = require('serve-index');",
      ],
      Namespace: [
        "import * as express from 'express';",
        "import path from 'node:path';",
        "import serveIndex from 'serve-index';",
      ],
    }[ctx] ?? [
      "import express from 'express';",
      "import path from 'node:path';",
      "import serveIndex from 'serve-index';",
    ];
    const recv = ctx === 'Router' ? 'router' : 'app';
    const mw =
      r === 'ServeIndex'
        ? "serveIndex('/', { icons: true })"
        : `express.static(${ROOT[r]})`;
    const mount = ctx === 'Mount' ? "'/static', " : '';
    return [
      ...head,
      "import { dir } from './config';",
      ctx === 'Router'
        ? 'const router = express.Router();'
        : 'const app = express();',
      `${recv}.use(${mount}${mw});`,
      '',
    ].join('\n');
  },
};
