const { tag } = require('../../lib.cjs');
const { toolProgram } = require('../../mcp-sdk.cjs');

/** Sink tag -> [imports, pre, statement(value)]. */
const SINKS = {
  Eval: ['', '', (v) => `const out = eval(${v});`],
  NewFunction: ['', '', (v) => `const fn = new Function('x', ${v});`],
  FunctionCall: ['', '', (v) => `const fn = Function(${v});`],
  SetTimeoutString: ['', '', (v) => `setTimeout(${v}, 10);`],
  SetIntervalString: ['', '', (v) => `setInterval(${v}, 1000);`],
  VmNewContext: [
    "import vm from 'node:vm';",
    '',
    (v) => `vm.runInNewContext(${v}, {});`,
  ],
  VmNamedThisContext: [
    "import { runInThisContext } from 'vm';",
    '',
    (v) => `runInThisContext(${v});`,
  ],
  VmScript: [
    "import * as vm from 'node:vm';",
    '',
    (v) => `new vm.Script(${v}).runInNewContext({});`,
  ],
  VmRequireCompile: [
    '',
    "const vm = require('vm');",
    (v) => `vm.compileFunction(${v}, ['x']);`,
  ],
  Vm2Run: [
    "import { VM } from 'vm2';",
    '',
    (v) => `new VM({ timeout: 100 }).run(${v});`,
  ],
  NodeVmRun: [
    "import { NodeVM } from 'vm2';",
    'const sandbox = new NodeVM();',
    (v) => `sandbox.run(${v});`,
  ],
  SetTimeoutFn: ['', '', (v) => `setTimeout(() => console.log(${v}), 10);`],
  TimersPromises: [
    "import { setTimeout } from 'node:timers/promises';",
    '',
    (v) => `await setTimeout(100, ${v});`,
  ],
  JsonParse: ['', '', (v) => `const data = JSON.parse(${v});`],
  MathjsEvaluate: [
    "import { evaluate } from 'mathjs';",
    '',
    (v) => `const out = evaluate(${v});`,
  ],
};

const FLOWS = {
  Direct: (a) => ['', a],
  Template: (a) => ['', `\`return \${${a}};\``],
  Concat: (a) => ['', `'(' + ${a} + ')'`],
  Derived: (a) => [`const src = ${a}.trim();`, 'src'],
  HelperReturn: (a) => [`const src = wrap(${a});`, 'src'],
  OpaqueCall: (a) => ['', `compileExpression(${a})`],
  Literal: () => ['', "'1 + 1'"],
};

module.exports = {
  rule: 'no-code-injection-in-tool',
  // Wiring: 7 gates x 8 registrations - 2 invalid = 54, x 2 sinks x 2 flows = 216.
  // Sinks: 15 sinks x 7 flows = 105.
  domain: 321,
  traces: 3000,
  key: (s) =>
    `${tag(s.part)}|${tag(s.gate)}|${tag(s.reg)}|${tag(s.sink)}|${tag(s.flow)}`,
  code: (s) => {
    const [imports, pre, stmt] = SINKS[tag(s.sink)];
    const flow = FLOWS[tag(s.flow)];
    return toolProgram(
      tag(s.gate),
      tag(s.reg),
      (a) => {
        const [p, v] = flow(a);
        return [p, stmt(v)].filter(Boolean).join('\n');
      },
      {
        arg: 'expr',
        imports: [
          imports,
          "import { compileExpression } from './expressions';",
        ].join('\n'),
        pre: [pre, 'function wrap(s: string) {\n  return `(${s})`;\n}']
          .filter(Boolean)
          .join('\n'),
      },
    );
  },
};
