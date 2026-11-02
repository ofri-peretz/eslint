const { tag } = require('../../lib.cjs');

const FN = {
  StreamText: 'streamText',
  StreamObject: 'streamObject',
  GenerateText: 'generateText',
};

module.exports = {
  rule: 'require-abort-signal',
  domain: 216, // 2 importsAi x 6 opts x 3 fns x 3 spellings x 2 targets
  traces: 2600,
  key: (s) =>
    ['importsAi', 'opts', 'fn', 'spelling', 'withGenerate']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    s.withGenerate
      ? { targetFunctions: ['streamText', 'streamObject', 'generateText'] }
      : {},
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
    const base = "model: m, prompt: 'Stream a long response'";
    const arg = {
      NoSignal: `{ ${base} }`,
      AbortSignalKey: `{ ${base}, abortSignal: controller.signal }`,
      SignalKey: `{ ${base}, signal: controller.signal }`,
      ReqSignal: `{ ${base}, abortSignal: req.signal }`,
      QuotedAbortSignal: `{ ${base}, 'abortSignal': controller.signal }`,
      SpreadBase: `{ ...signalOptions, ${base} }`,
    }[tag(s.opts)];
    return [
      imp,
      "import { m, signalOptions } from './config';",
      'export async function POST(req) {',
      '  const controller = new AbortController();',
      `  return ${callee}(${arg});`,
      '}',
      '',
    ].join('\n');
  },
};
