const { tag } = require('../../lib.cjs');
const { CLIENTS, KEYS, clientFile, keyArgs } = require('../../ai-sdk.cjs');

/** Prop tag -> the option name, the client that takes it, its key literal. */
const PROPS = {
  ApiKey: { name: 'apiKey', client: 'Default', key: KEYS.anthropic },
  AuthToken: { name: 'authToken', client: 'Default', key: KEYS.anthropic },
  WebhookKey: {
    name: 'webhookKey',
    client: 'Default',
    key: "'whsec_abc123def456ghi789jkl0'",
  },
  AwsSecretKey: { name: 'awsSecretKey', client: 'Bedrock', key: KEYS.aws },
  AwsSecretAccessKey: {
    name: 'awsSecretAccessKey',
    client: 'Bedrock',
    key: KEYS.aws,
  },
  AwsSessionToken: {
    name: 'awsSessionToken',
    client: 'Bedrock',
    key: "'IQoJb3JpZ2luX2VjEXAMPLE1234567890'",
  },
  AccessToken: {
    name: 'accessToken',
    client: 'Vertex',
    key: "'ya29.a0AfH6SMBexample1234567890'",
  },
  AwsAccessKey: {
    name: 'awsAccessKey',
    client: 'Bedrock',
    key: "'AKIAIOSFODNN7EXAMPLE'",
  },
  BaseUrl: { name: 'baseURL', client: 'Default', key: KEYS.anthropic },
};

function code(s) {
  const p = PROPS[tag(s.prop)];
  const spelling = tag(s.spelling);
  const client =
    CLIENTS.anthropic[spelling === 'Default' ? p.client : spelling];
  const { imports, pre, args, param } = keyArgs(
    tag(s.value),
    'anthropic',
    p.name,
    p.key,
  );
  return clientFile(client, args, { imports, pre, param });
}

module.exports = {
  rule: 'no-hardcoded-api-key',
  // 18 values + 9 props x 2 + 13 spellings x 2
  domain: 18 + 9 * 2 + 13 * 2,
  traces: 700,
  key: (s) =>
    `${tag(s.part)}|${tag(s.value)}|${tag(s.prop)}|${tag(s.spelling)}`,
  code,
};
