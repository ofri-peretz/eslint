const { tag } = require('../../lib.cjs');

const SINK = {
  Eval: (x) => `eval(${x});`,
  NewFunction: (x) => `new Function(${x})();`,
  InnerHTML: (x) => `el.innerHTML = ${x};`,
  DbQuery: (x) => `await db.query(${x});`,
  ChildExec: (x) => `exec(${x});`,
  NodeExecSync: (x) => `execSync(${x});`,
  RegexExec: (x) => `/^ok$/.exec(${x});`,
  FetchUrl: (x) => `await fetch(${x});`,
  FetchQuery: (x) =>
    `await fetch(\`https://api.example.com/search?q=\${${x}}\`);`,
};

module.exports = {
  rule: 'no-unsafe-output-handling',
  domain: 90, // 2 importsAi x 9 sinks x 5 sources
  traces: 1200,
  key: (s) =>
    ['importsAi', 'sink', 'source'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  config: () => ({}),
  code: (s) => {
    const sink = SINK[tag(s.sink)];
    const head = [
      s.importsAi
        ? "import { generateText, tool } from 'ai';"
        : "import { generateText, tool } from './llm';",
      "import { exec } from 'child_process';",
      "import { execSync } from 'node:child_process';",
      "import DOMPurify from 'dompurify';",
      "import { z } from 'zod';",
      "import { db, el, m } from './deps';",
    ].join('\n');
    const src = tag(s.source);
    if (src === 'ToolInput')
      return `${head}\nexport const runTool = tool({\n  description: 'run',\n  inputSchema: z.object({ command: z.string() }),\n  execute: async ({ command }) => {\n    ${sink('command')}\n    return 'done';\n  },\n});\n`;
    const pre = src === 'ViaLocal' ? ['const code = result.text;'] : [];
    const value = {
      Direct: 'result.text',
      Sanitized: 'DOMPurify.sanitize(result.text)',
      Trimmed: 'result.text.trim()',
      ViaLocal: 'code',
    }[src];
    return [
      head,
      'export async function POST(req) {',
      "  const result = await generateText({ model: m, prompt: 'Generate code' });",
      ...pre.map((l) => `  ${l}`),
      `  ${sink(value)}`,
      '}',
      '',
    ].join('\n');
  },
};
