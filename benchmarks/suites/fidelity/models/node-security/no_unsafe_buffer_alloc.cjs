const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'no-unsafe-buffer-alloc',
  domain: 135, // 3 allocators x 9 uses x 5 sizes
  traces: 1500,
  key: (s) => `${tag(s.alloc)}|${tag(s.use)}|${tag(s.allocSize)}`,
  code: (s) => {
    const fn = {
      AllocUnsafe: 'allocUnsafe',
      AllocUnsafeSlow: 'allocUnsafeSlow',
      AllocSafe: 'alloc',
    }[tag(s.alloc)];
    const [pre, n] = {
      Lit: ['', '64'],
      Param: ['', 'width'],
      ReqLength: [
        "const declared = Number(req.headers['content-length']);",
        'declared',
      ],
      ReqUpperGuarded: [
        "const declared = Number(req.headers['content-length']);\n  if (declared > 65536) throw new Error('too large');",
        'declared',
      ],
      ReqLowerGuarded: [
        "const declared = Number(req.headers['content-length']);\n  if (declared < 1) throw new Error('empty');",
        'declared',
      ],
    }[tag(s.allocSize)];
    const a = `Buffer.${fn}(${n})`;
    const body = {
      SentDirect: `const out = ${a};\n  res.end(out);`,
      ChainedFill: `const out = ${a}.fill(0);\n  res.end(out);`,
      CopyCover: `const out = ${a};\n  src.copy(out);\n  res.end(out);`,
      SetCover: `const out = ${a};\n  out.set(src);\n  res.end(out);`,
      FixedWriteOnly: `const out = ${a};\n  out.writeUInt32BE(src.length, 0);\n  res.end(out);`,
      FixedThenFill: `const out = ${a};\n  out.writeUInt32BE(src.length, 0);\n  out.fill(0);\n  res.end(out);`,
      ReturnDirect: `return ${a};`,
      LoopWrite: `const out = ${a};\n  let offset = 0;\n  for (const item of items) {\n    out.write(item, offset);\n    offset += Buffer.byteLength(item);\n  }\n  res.end(out);`,
      IndexWrite: `const out = ${a};\n  out[0] = 1;\n  res.end(out);`,
    }[tag(s.use)];
    return `export function handler(req: any, res: any, src: Buffer, items: string[], width: number) {\n  ${pre}\n  ${body}\n}\n`;
  },
  model: (s) => s.verdict,
};
