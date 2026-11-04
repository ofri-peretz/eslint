const { tag } = require('../../lib.cjs');

const CALL = {
  Replace: ".replace(/x/g, '')",
  Trim: '.trim()',
  ToLowerCase: '.toLowerCase()',
  Split: ".split(',')",
  Substring: '.substring(0, 10)',
  Slice: '.slice(0, 10)',
  StartsWith: ".startsWith('a')",
  EndsWith: ".endsWith('a')",
  Includes: ".includes('a')",
  MatchM: '.match(/a/)',
  ToUpperCase: '.toUpperCase()',
  ToStringM: '.toString()',
};

/** Handler body lines for a raw query member `q`, the call `m`. */
const DIRECT = {
  NoGuard: (q, m) => [`const out = ${q}${m};`],
  TypeofAnd: (q, m) => [`const out = typeof ${q} === 'string' && ${q}${m};`],
  TypeofReturn: (q, m) => [
    `if (typeof ${q} !== 'string') return res.sendStatus(400);`,
    `const out = ${q}${m};`,
  ],
  IsArrayReject: (q, m) => [
    `if (Array.isArray(${q}) || typeof ${q} !== 'string') return res.sendStatus(400);`,
    `const out = ${q}${m};`,
  ],
  CoerceAtSource: (q, m) => [`const out = String(${q})${m};`],
  OtherProp: (q, m, p) => [
    `const out = typeof ${p}.query.other === 'string' && ${q}${m};`,
  ],
};

const TAINTED = {
  NoGuard: (q, m) => [`const v = ${q};`, `const out = v${m};`],
  TypeofAnd: (q, m) => [
    `const v = ${q};`,
    `const out = typeof v === 'string' && v${m};`,
  ],
  TypeofReturn: (q, m) => [
    `const v = ${q};`,
    "if (typeof v !== 'string') return res.sendStatus(400);",
    `const out = v${m};`,
  ],
  IsArrayReject: (q, m) => [
    `const v = ${q};`,
    "if (Array.isArray(v) || typeof v !== 'string') return res.sendStatus(400);",
    `const out = v${m};`,
  ],
  CoerceAtSource: (q, m) => [`const v = String(${q});`, `const out = v${m};`],
  OtherProp: (q, m, p) => [
    `const v = ${q};`,
    `const out = typeof ${p}.query.other === 'string' && v${m};`,
  ],
  ReassignString: (q, m) => [
    `let v: any = ${q};`,
    'v = String(v);',
    `const out = v${m};`,
  ],
  ReassignParse: (q, m) => [
    `let v: any = ${q};`,
    'v = schema.parse(v);',
    `const out = v${m};`,
  ],
  ReassignValidate: (q, m) => [
    `let v: any = ${q};`,
    'v = check.validate(v);',
    `const out = v${m};`,
  ],
  ReassignToStr: (q, m) => [
    `let v: any = ${q};`,
    'v = toStr(v);',
    `const out = v${m};`,
  ],
};

module.exports = {
  rule: 'require-query-type-guard',
  // (6 direct + 10 tainted guards) x 2 access x 2 param x 2 recv x 2 opts,
  // plus 11 more methods on the plain unguarded direct call
  domain: 16 * 16 + 11,
  traces: 4000,
  key: (s) =>
    ['method', 'flow', 'guard', 'access', 'param', 'recv', 'opts']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    tag(s.opts) === 'Custom'
      ? { coercers: ['String', 'toStr'], validators: ['validate'] }
      : undefined,
  code: (s) => {
    const p = tag(s.param) === 'Req' ? 'req' : 'request';
    const q =
      tag(s.access) === 'Dot' ? `${p}.query.name` : `${p}.query['name']`;
    const recv = tag(s.recv) === 'App' ? 'app' : 'router';
    const body = (tag(s.flow) === 'Direct' ? DIRECT : TAINTED)[tag(s.guard)](
      q,
      CALL[tag(s.method)],
      p,
    );
    return [
      "import express from 'express';",
      "import { schema, check, toStr } from './validation';",
      tag(s.recv) === 'App'
        ? 'const app = express();'
        : 'const router = express.Router();',
      `${recv}.get('/search', (${p}: any, res: any) => {`,
      ...body.map((l) => `  ${l}`),
      '  res.json({ out });',
      '});',
      '',
    ].join('\n');
  },
};
