const { tag } = require('../../lib.cjs');

const DEFAULTS = [
  'password',
  'secret',
  'apiKey',
  'api_key',
  'token',
  'credential',
  'ssn',
  'socialSecurity',
  'creditCard',
  'cardNumber',
  'cvv',
  'privateKey',
  'private_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authToken',
  'bearer',
  'connectionString',
  'dbPassword',
  'dbUser',
];

module.exports = {
  rule: 'no-sensitive-in-prompt',
  domain: 96, // 2 importsAi x 12 values x 2 locations x 2 custom
  traces: 1200,
  key: (s) =>
    ['importsAi', 'value', 'loc', 'custom']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    s.custom ? { sensitivePatterns: [...DEFAULTS, 'favoriteColor'] } : {},
  code: (s) => {
    const pre = [];
    const text = {
      PasswordVar: 'Reset password for user. Current: ${userPassword}',
      ApiKeyVar: 'Configure service with key: ${apiKey}',
      MemberPassword: 'Reset with: ${user.password}',
      BracketPassword: "Reset with: ${user['password']}",
      BusinessName: 'Describe the company ${businessName}',
      MaxTokens: 'Answer in at most ${maxTokens} words',
      UserId: 'Validate the credit card on file for user ${userId}',
      Redacted: 'Current password: ${redact(userPassword)}',
      LiteralRedacted: 'Current password: [REDACTED]',
      UserName: 'Greet ${user.name}',
      RecordWithSecret: 'Debug this login: ${JSON.stringify(creds)}',
      CustomTerm: 'Suggest a gift in ${favoriteColor}',
    }[tag(s.value)];
    if (tag(s.value) === 'RecordWithSecret')
      pre.push('const creds = { email: user.email, password: userPassword };');
    const tpl = '`' + text + '`';
    const opt =
      tag(s.loc) === 'PromptLoc'
        ? `prompt: ${tpl}`
        : `messages: [{ role: 'user', content: ${tpl} }]`;
    const head = s.importsAi
      ? "import { generateText } from 'ai';\nimport { openai } from '@ai-sdk/openai';"
      : "import { generateText, openai } from './llm';";
    return [
      head,
      "import { redact } from './redact';",
      'export async function run(user, userPassword, apiKey, businessName, maxTokens, userId, favoriteColor) {',
      ...pre.map((l) => `  ${l}`),
      `  return generateText({ model: openai('gpt-4o'), ${opt} });`,
      '}',
      '',
    ].join('\n');
  },
};
