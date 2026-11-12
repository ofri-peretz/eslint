const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 52,
  traces: 400,
  rule: 'no-unchecked-loop-condition',
  key: (s) =>
    `${tag(s.loop)}|${tag(s.exit)}|${tag(s.bound)}|allowBreak=${s.allowBreak}|budget=${s.budget}`,
  config: (s) => ({
    allowWhileTrueWithBreak: s.allowBreak,
    ...(s.budget ? { maxStaticIterations: 10000 } : {}),
  }),
  code: (s) => {
    const l = tag(s.loop);
    const exit = {
      NoExit: '',
      Break: 'if (processItem()) break;',
      Return: 'if (processItem()) return 1;',
      Throw: "if (processItem()) throw new Error('done');",
      NestedBreak: 'for (const x of queue) { if (x) break; }',
    }[tag(s.exit)];
    const body = `{\n    processItem();\n    ${exit}\n  }`;
    const n = {
      ReqDirect: 'req.query.count',
      ParseIntReq: 'count',
      DestructReq: 'count',
      Clamped: 'count',
      SmallLit: '100',
      HugeLit: '1000000',
      HugeBigInt: '1000000n',
    }[tag(s.bound)];
    const pre =
      {
        ParseIntReq: 'const count = parseInt(req.query.count, 10);',
        DestructReq: 'const { count } = req.query;',
        Clamped:
          'const count = Math.min(parseInt(req.query.count, 10) || 0, 1000);',
      }[tag(s.bound)] ?? '';
    const loop = {
      WhileTrue: `while (true) ${body}`,
      ForEver: `for (;;) ${body}`,
      DoWhileTrue: `do ${body} while (true);`,
      WhileOne: `while (1) ${body}`,
      ForBound: `for (let i = 0; i < ${n}; i++) {\n    doWork(i);\n  }`,
      WhileBound: `let i = 0;\n  while (i < ${n}) {\n    doWork(i);\n    i++;\n  }`,
    }[l];
    return `declare function processItem(): boolean;\ndeclare function doWork(i: number): void;\ndeclare const queue: unknown[];\nexport function run(req: any) {\n  ${pre}\n  ${loop}\n  return 0;\n}\n`;
  },
};
