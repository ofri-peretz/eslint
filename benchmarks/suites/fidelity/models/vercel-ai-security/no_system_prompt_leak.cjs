const { tag } = require('../../lib.cjs');

const PAYLOAD = {
  SystemPromptKey: '{ systemPrompt: SYSTEM_PROMPT, response: result.text }',
  ValueNamed: '{ data: systemPrompt }',
  SystemKeyAnyValue: '{ system: persona, response: result.text }',
  NestedInstructions:
    '{ meta: { instructions: persona }, response: result.text }',
  OnlyResponse: '{ response: result.text }',
  ModelOptions: "{ model: openai('gpt-4o'), system: SYSTEM_PROMPT }",
  Bare: 'systemPrompt',
};

module.exports = {
  rule: 'no-system-prompt-leak',
  domain: 56, // 2 importsAi x 4 sinks x 7 payloads
  traces: 800,
  key: (s) =>
    ['importsAi', 'sink', 'payload'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  config: () => ({}),
  code: (s) => {
    const p = PAYLOAD[tag(s.payload)];
    const out = {
      ResponseJson: `return Response.json(${p});`,
      ResJson: `res.json(${p});`,
      NewResponseStringify: `return new Response(JSON.stringify(${p}));`,
      ReturnObj: `return ${p};`,
    }[tag(s.sink)];
    return [
      s.importsAi
        ? "import { generateText } from 'ai';\nimport { openai } from '@ai-sdk/openai';"
        : "import { generateText, openai } from './llm';",
      "import { SYSTEM_PROMPT, persona } from './prompts';",
      'export async function handler(req, res) {',
      '  const systemPrompt = SYSTEM_PROMPT;',
      "  const result = await generateText({ model: openai('gpt-4o'), system: systemPrompt, prompt: 'hi' });",
      `  ${out}`,
      '}',
      '',
    ].join('\n');
  },
};
