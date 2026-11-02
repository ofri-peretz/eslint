const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'require-output-validation',
  domain: 84, // 2 importsAi x 6 displays x 7 values
  traces: 1100,
  key: (s) =>
    ['importsAi', 'display', 'value'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  config: () => ({}),
  code: (s) => {
    const value = {
      Text: 'result.text',
      Content: 'response.content',
      ErrMessage: 'err.message',
      Usage: 'result.usage',
      Validated: 'validateOutput(result.text)',
      Sanitized: 'sanitize(result.text)',
      InObject: '{ message: result.text }',
    }[tag(s.value)];
    const call = {
      DisplayFn: `display(${value});`,
      RenderFn: `render(${value});`,
      RespondFn: `respond(${value});`,
      ResSend: `res.send(${value});`,
      ResponseJson: `return Response.json(${value});`,
      LoggerInfo: `logger.info(${value});`,
    }[tag(s.display)];
    return [
      s.importsAi
        ? "import { generateText } from 'ai';"
        : "import { generateText } from './llm';",
      "import { display, render, respond, logger, validateOutput, sanitize, m } from './ui';",
      'export async function handler(req, res, err) {',
      "  const result = await generateText({ model: m, prompt: 'Summarise' });",
      '  const response = result.response;',
      `  ${call}`,
      '}',
      '',
    ].join('\n');
  },
};
