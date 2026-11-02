const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'no-buffer-overread',
  domain: 216, // 6 receivers x 3 accesses x 6 index shapes x 2 option values
  traces: 2500,
  key: (s) =>
    `${tag(s.recv)}|${tag(s.access)}|${tag(s.index)}|unvalidated=${s.strictOpt}`,
  config: (s) => ({ reportUnvalidatedIndices: s.strictOpt }),
  code: (s) => {
    const [decl, r] = {
      BufFrom: ["const packet = Buffer.from('hello world payload');", 'packet'],
      BufAlloc: ['const packet = Buffer.alloc(64);', 'packet'],
      U8Array: ['const packet = new Uint8Array(64);', 'packet'],
      ParamBuf: ['', 'buf'],
      PlainArray: ['const packet = [1, 2, 3, 4];', 'packet'],
      ParamOther: ['', 'items'],
    }[tag(s.recv)];
    const [setup, idx, guardOpen, guardClose] = {
      Literal: ['', '0', '', ''],
      ReqInline: ['', 'parseInt(req.query.index)', '', ''],
      ReqViaConst: [
        'const index = parseInt(req.query.index);',
        'index',
        '',
        '',
      ],
      Unresolved: ['', 'offset', '', ''],
      ReqRangeGuard: [
        'const index = parseInt(req.query.index);',
        'index',
        `if (index >= 0 && index + 4 <= ${r}.length) {`,
        '}',
      ],
      ReqCheckFn: [
        `const index = parseInt(req.query.index);\n  if (!checkBounds(${r}, index)) return;`,
        'index',
        '',
        '',
      ],
    }[tag(s.index)];
    const access = {
      IndexAccess: `const v = ${r}[${idx}];`,
      ReadUInt32: `const v = ${r}.readUInt32LE(${idx});`,
      Slice: `const v = ${r}.slice(${idx}, ${idx} + 4);`,
    }[tag(s.access)];
    return `declare function checkBounds(b: unknown, i: number): boolean;\nexport function handler(req: any, buf: any, items: any, offset: number) {\n  ${decl}\n  ${setup}\n  ${guardOpen}\n  ${access}\n  return v;\n  ${guardClose}\n}\n`;
  },
  model: (s) => s.verdict,
};
