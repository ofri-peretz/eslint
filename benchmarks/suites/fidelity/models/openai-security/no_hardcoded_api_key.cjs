const { tag } = require('../../lib.cjs');
const { CLIENTS, KEYS, clientFile, keyArgs } = require('../../ai-sdk.cjs');

/** Prop tag -> the option name and its key-shaped literal. */
const PROPS = {
  ApiKey: { name: 'apiKey', key: KEYS.openai },
  AdminApiKey: { name: 'adminAPIKey', key: "'sk-admin-abc123xyz789def456'" },
  WebhookSecret: {
    name: 'webhookSecret',
    key: "'whsec_abc123def456ghi789jkl0'",
  },
  Organization: { name: 'organization', key: "'org-AbC123dEf456GhI789jKl0'" },
  BaseUrl: { name: 'baseURL', key: KEYS.openai },
};

/** The Agents SDK's process-wide key, set positionally. */
const SET_DEFAULT_KEY = {
  head: "import { setDefaultOpenAIKey } from '@openai/agents';",
  ctor: (args) => `const client = setDefaultOpenAIKey(${args});`,
};

function code(s) {
  const p = PROPS[tag(s.prop)];
  const spelling = tag(s.spelling);
  const positional = spelling === 'SetDefaultKey';
  const client = positional ? SET_DEFAULT_KEY : CLIENTS.openai[spelling];
  const { imports, pre, args, param } = keyArgs(
    tag(s.value),
    'openai',
    positional ? null : p.name,
    p.key,
  );
  return clientFile(client, args, { imports, pre, param });
}

module.exports = {
  rule: 'no-hardcoded-api-key',
  // 18 values + 5 props x 2 + 15 spellings x 2
  domain: 18 + 5 * 2 + 15 * 2,
  traces: 700,
  key: (s) =>
    `${tag(s.part)}|${tag(s.value)}|${tag(s.prop)}|${tag(s.spelling)}`,
  code,
};
