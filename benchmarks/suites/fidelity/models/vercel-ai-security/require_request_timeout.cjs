const { tag, withTestFile } = require('../../lib.cjs');

const FN = {
  GenerateText: 'generateText',
  StreamText: 'streamText',
  GenerateObject: 'generateObject',
};

const base = {
  rule: 'require-request-timeout',
  domain: 126, // 2 importsAi x 7 opts x 3 fns x 3 spellings
  traces: 1600,
  key: (s) =>
    ['importsAi', 'opts', 'fn', 'spelling']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: () => ({}),
  code: (s) => {
    const name = FN[tag(s.fn)];
    const sp = tag(s.spelling);
    const src = s.importsAi ? "'ai'" : "'./llm'";
    const imp = {
      Named: `import { ${name} } from ${src};`,
      Namespace: `import * as ai from ${src};`,
      Aliased: `import { ${name} as callModel } from ${src};`,
    }[sp];
    const callee = {
      Named: name,
      Namespace: `ai.${name}`,
      Aliased: 'callModel',
    }[sp];
    const base = "model: m, prompt: 'Hello'";
    const arg = {
      NoArgs: '',
      InlineNoTimeout: `{ ${base} }`,
      InlineTimeout: `{ ${base}, timeout: 30000 }`,
      InlineAbortSignal: `{ ${base}, abortSignal: controller.signal }`,
      AbortSignalTimeout: `{ ${base}, abortSignal: AbortSignal.timeout(30000) }`,
      SpreadBase: "{ ...baseOptions, prompt: 'Hello' }",
      OptsVar: 'opts',
    }[tag(s.opts)];
    return [
      imp,
      "import { m, baseOptions, opts } from './config';",
      'export async function POST(req) {',
      '  const controller = new AbortController();',
      `  return ${callee}(${arg});`,
      '}',
      '',
    ].join('\n');
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
