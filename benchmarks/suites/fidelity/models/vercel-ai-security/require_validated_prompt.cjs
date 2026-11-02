const { tag, withTestFile } = require('../../lib.cjs');

const DEFAULT_VALIDATORS = [
  'validateInput',
  'sanitizeInput',
  'validatePrompt',
  'sanitizePrompt',
  'escapeInput',
  'cleanInput',
];

const base = {
  rule: 'require-validated-prompt',
  domain: 112, // 2 importsAi x 14 prompts x 2 fns x 2 customCfg
  traces: 1500,
  key: (s) =>
    ['importsAi', 'prompt', 'fn', 'customCfg']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    s.customCfg
      ? { validatorFunctions: [...DEFAULT_VALIDATORS, 'cleanUserInput'] }
      : {},
  code: (s) => {
    const fn = tag(s.fn) === 'GenerateText' ? 'generateText' : 'streamText';
    const pre = [];
    let value;
    switch (tag(s.prompt)) {
      case 'StaticString':
        value = "'What is the capital of France?'";
        break;
      case 'ReqBody':
        value = 'req.body.question';
        break;
      case 'ReqBodyDestructured':
        pre.push('const { question } = req.body;');
        value = 'question';
        break;
      case 'ReqQuery':
        value = 'req.query.q';
        break;
      case 'NamedUserInput':
        value = 'userInput';
        break;
      case 'NonUserName':
        value = 'articleText';
        break;
      case 'InputTokensName':
        value = 'String(inputTokens)';
        break;
      case 'ConcatReq':
        value = "'Answer this: ' + req.body.question";
        break;
      case 'TemplateReq':
        value = '`User asked: ${req.body.question}`';
        break;
      case 'ValidatedReq':
        value = 'validateInput(req.body.question)';
        break;
      case 'ValidatedTemplate':
        value = '`User asked: ${sanitizePrompt(req.body.question)}`';
        break;
      case 'SchemaParsed':
        pre.push('const { question } = questionSchema.parse(req.body);');
        value = 'question';
        break;
      case 'CustomValidated':
        value = 'cleanUserInput(req.body.question)';
        break;
      case 'TrimmedReq':
        value = 'req.body.question.trim()';
        break;
    }
    const head = s.importsAi
      ? "import { generateText, streamText } from 'ai';\nimport { openai } from '@ai-sdk/openai';"
      : "import { generateText, streamText, openai } from './llm';";
    return [
      head,
      "import { validateInput, sanitizePrompt, cleanUserInput, questionSchema } from './validation';",
      'export async function POST(req, userInput, articleText, inputTokens) {',
      ...pre.map((l) => `  ${l}`),
      `  return ${fn}({ model: openai('gpt-4o'), prompt: ${value} });`,
      '}',
      '',
    ].join('\n');
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
