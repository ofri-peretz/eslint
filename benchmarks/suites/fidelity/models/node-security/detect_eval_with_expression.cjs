const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'detect-eval-with-expression',
  domain: 72, // 9 sinks x 4 args x 2 option values
  traces: 800,
  key: (s) => `${tag(s.sink)}|${tag(s.arg)}|allowLit=${s.allowLit}`,
  config: (s) => ({ allowLiteralStrings: s.allowLit }),
  code: (s) => {
    const [pre, x] = {
      Literal: ['', "'total = price * 2'"],
      ConstHop: ["const SCRIPT = 'total = price * 2';", 'SCRIPT'],
      MultiWrite: [
        "let script = 'total = price * 2';\n  script = req.body.code;",
        'script',
      ],
      Dynamic: ['', 'req.body.code'],
    }[tag(s.arg)];
    const [head, call] = {
      Eval: ['', `eval(${x});`],
      FunctionCtor: ['', `new Function('price', ${x});`],
      VmCjs: [
        "const vm = require('vm');",
        `vm.runInNewContext(${x}, { price: 1 });`,
      ],
      VmNodeDestructured: [
        "const { runInThisContext } = require('node:vm');",
        `runInThisContext(${x});`,
      ],
      VmEsmScript: ["import vm from 'node:vm';", `new vm.Script(${x});`],
      VmBracket: [
        "const vm = require('node:vm');",
        `vm['runInNewContext'](${x}, {});`,
      ],
      Vm2NodeVM: [
        "const { NodeVM } = require('vm2');",
        `new NodeVM({ console: 'inherit' }).run(${x}, 'plugin.js');`,
      ],
      LocalVmObject: [
        'const vm = { runInNewContext: (s: string, c: object) => [s, c] };',
        `vm.runInNewContext(${x}, {});`,
      ],
      LocalVMClass: [
        'class VM { run(s: string) { return s; } }',
        `new VM().run(${x});`,
      ],
    }[tag(s.sink)];
    return `${head}\nexport function handler(req: any) {\n  ${pre}\n  ${call}\n}\n`;
  },
  model: (s) => s.verdict,
};
