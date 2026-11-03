const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 28,
  traces: 250,
  rule: 'no-unlimited-resource-allocation',
  key: (s) => `${tag(s.alloc)}|${tag(s.amount)}`,
  config: () => ({}),
  code: (s) => {
    const sz = tag(s.amount);
    const pre =
      {
        ParseIntReq: 'const size = parseInt(req.query.size, 10);',
        DestructReq: 'const {\n    query: { size },\n  } = req;',
        Clamped:
          'const size = Math.min(parseInt(req.query.size, 10) || 0, MAX_SIZE);',
        Checked:
          "const size = parseInt(req.query.size, 10);\n  if (size > MAX_SIZE || size <= 0) throw new Error('Invalid size');",
      }[sz] ?? '';
    const arg = {
      ReqQuery: 'req.query.size',
      ParseIntReq: 'size',
      DestructReq: 'size',
      Clamped: 'size',
      Checked: 'size',
      SmallLit: '1024',
      HugeLit: '104857600',
    }[sz];
    const alloc = {
      BufferAlloc: `Buffer.alloc(${arg})`,
      BufferAllocUnsafe: `Buffer.allocUnsafe(${arg})`,
      NewArray: `new Array(${arg})`,
      NewArrayBuffer: `new ArrayBuffer(${arg})`,
    }[tag(s.alloc)];
    return `const MAX_SIZE = 10 * 1024 * 1024;\nexport function handler(req: any, res: any) {\n  ${pre}\n  const buf = ${alloc};\n  res.json({ n: buf.length });\n}\n`;
  },
};
