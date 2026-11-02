const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'no-deprecated-buffer',
  domain: 24, // 8 forms x 3 args
  traces: 300,
  key: (s) => `${tag(s.form)}|${tag(s.arg)}`,
  code: (s) => {
    const a = { Num: '64', Str: "'hello'", Var: 'input' }[tag(s.arg)];
    const [head, expr] = {
      NewGlobal: ['', `new Buffer(${a})`],
      CallGlobal: ['', `Buffer(${a})`],
      NewImportedNode: [
        "import { Buffer } from 'node:buffer';",
        `new Buffer(${a})`,
      ],
      NewNamespaceMember: [
        "import * as buffer from 'buffer';",
        `new buffer.Buffer(${a})`,
      ],
      NewAlias: ['const B = Buffer;', `new B(${a})`],
      AllocSafe: ['', `Buffer.alloc(typeof ${a} === 'number' ? ${a} : 8)`],
      FromSafe: ['', `Buffer.from(String(${a}))`],
      LocalShim: [
        'class Buffer { constructor(public v: unknown) {} }',
        `new Buffer(${a})`,
      ],
    }[tag(s.form)];
    return `${head}\nexport function make(input: any) {\n  return ${expr};\n}\n`;
  },
  model: (s) => s.verdict,
};
