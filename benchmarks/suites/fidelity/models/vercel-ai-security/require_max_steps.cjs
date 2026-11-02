const { tag, num } = require('../../lib.cjs');

module.exports = {
  domain: 128,
  traces: 1500,
  pkg: 'eslint-plugin-vercel-ai-security',
  rule: 'require-max-steps',
  key: (s) =>
    `ai=${s.importsAi} obj=${s.isObjectArg} tools=${s.hasTools} ${tag(s.key)}=${tag(s.value)}`,
  config: () => ({}),
  code: (s) => {
    const head = s.importsAi
      ? "import { generateText, hasToolCall, stepCountIs } from 'ai';\n"
      : '';
    // Inside a route handler: request data is `.body` of a parameter, as the rule requires.
    const handler = (call) =>
      `${head}export async function POST(req) {\n  ${call}\n}`;
    if (!s.isObjectArg) return handler('generateText(opts);');
    const value = {
      Literal: '10',
      InfinityValue: 'Infinity',
      FromRequest: 'req.body.steps',
      StepCountLiteral: 'stepCountIs(10)',
      StepCountFromRequest: 'stepCountIs(req.body.n)',
      HasToolCallOnly: "hasToolCall('done')",
      HasToolCallAndCount: "[hasToolCall('done'), stepCountIs(10)]",
    }[tag(s.value)];
    const parts = ['model: m', "prompt: 'x'"];
    if (s.hasTools) parts.push('tools: { t }');
    if (value)
      parts.push(
        `${tag(s.key) === 'MaxSteps' ? 'maxSteps' : 'stopWhen'}: ${value}`,
      );
    return handler(`generateText({ ${parts.join(', ')} });`);
  },
  model: (s) => s.verdict,
};
