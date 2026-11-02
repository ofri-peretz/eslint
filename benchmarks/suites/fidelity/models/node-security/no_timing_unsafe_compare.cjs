const { tag } = require('../../lib.cjs');

module.exports = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-timing-unsafe-compare',
  domain: 270, // 5 left x 6 right x 3 ops x 3 option sets
  traces: 4000,
  key: (s) => `${tag(s.left)}|${tag(s.right)}|${tag(s.op)}|${tag(s.opt)}`,
  config: (s) =>
    ({
      Default: {},
      Unverified: { reportUnverifiedComparisons: true },
      Literals: { reportLiteralComparands: true },
    })[tag(s.opt)],
  code: (s) => {
    const l = {
      ReqBodyToken: 'req.body.token',
      ReqBodyValue: 'req.body.value',
      CtxSignature: 'ctx.request.body.signature',
      UserToken: 'userToken',
      Submitted: 'submitted',
    }[tag(s.left)];
    const r = {
      StoredToken: 'storedToken',
      ExpectedHmac: 'expectedHmac',
      TokenCount: 'tokenCount',
      AuthorId: 'authorId',
      Literal: "'access'",
      Plain: 'expected',
    }[tag(s.right)];
    const cmp = {
      StrictEq: `${l} === ${r}`,
      LooseNe: `${l} != ${r}`,
      TimingSafe: `timingSafeEqual(Buffer.from(String(${l})), Buffer.from(String(${r})))`,
    }[tag(s.op)];
    return `import { timingSafeEqual } from 'node:crypto';\nexport function check(req: any, ctx: any, userToken: string, submitted: string, storedToken: string, expectedHmac: string, tokenCount: number, authorId: string, expected: string) {\n  if (${cmp}) {\n    return true;\n  }\n  return false;\n}\n`;
  },
  model: (s) => s.verdict,
};
