const { tag } = require('../../lib.cjs');

const VALUE = {
  OpenAIKey: "'sk-proj-abc123xyz789def456'",
  AnthropicKey: "'sk-ant-api03-abcdef1234567890'",
  GoogleKey: "'AIzaSyA1234567890abcdefghijklmnopqrstuv'",
  NotAKey: "'sk-loading-spinner'",
  EnvRead: 'process.env.OPENAI_API_KEY',
  EnvVarName: "'OPENAI_API_KEY_PRODUCTION'",
  GenericLong: "'f3a9c1e7b2d84f6a9c0e1b7d3a5f8c2e'",
  UrlValue: "'https://api.openai.com/v1/chat/completions'",
};

module.exports = {
  rule: 'no-hardcoded-api-keys',
  domain: 64, // 2 importsAi x 4 locations x 8 values
  traces: 900,
  key: (s) =>
    ['importsAi', 'loc', 'value'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  config: () => ({}),
  code: (s) => {
    const raw = VALUE[tag(s.value)];
    // A Bearer header carries the literal inside the string.
    const header = raw.startsWith("'")
      ? `'Bearer ${raw.slice(1)}`
      : `\`Bearer \${${raw}}\``;
    const line = {
      ProviderApiKey: `export const provider = createOpenAI({ apiKey: ${raw} });`,
      AuthHeader: `export const client = createOpenAI({ headers: { Authorization: ${header} } });`,
      ModuleConst: `export const config = ${raw};`,
      ArrayElem: `export const keys = [${raw}];`,
    }[tag(s.loc)];
    return [
      s.importsAi
        ? "import { createOpenAI } from '@ai-sdk/openai';"
        : "import { createOpenAI } from './provider';",
      line,
      '',
    ].join('\n');
  },
};
