const { tag, withTestFile } = require('../../lib.cjs');
const { lambdaProgram } = require('../../lambda.cjs');

const NAME = {
  ApiKey: 'API_KEY',
  DbPassword: 'DB_PASSWORD',
  JwtSecret: 'JWT_SECRET',
  ClientSecret: 'OAUTH_CLIENT_SECRET',
  PartnerCredential: 'PARTNER_CREDENTIAL',
  LogLevel: 'LOG_LEVEL',
  TableName: 'TABLE_NAME',
};
const VALUE = {
  Literal: "'example-secret-value-1234'",
  StaticTemplate: '`example-secret-value-1234`',
  SecretArn: "'arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/db'",
  SsmPath: "'/prod/app/db-password'",
  FromEnv: 'process.env.UPSTREAM_VALUE',
  SecretRef: 'secret.secretArn',
};
const program = (gate, body, pre = [], imports = []) =>
  lambdaProgram(gate, [...body, 'return { statusCode: 200 };'], {
    imports: ["import { secret } from './secrets';", ...imports],
    pre,
  });
// Ctx -> whole module for env var `n` = value `v`
const CTX = {
  ProcessEnvAssign: (g, n, v) => program(g, [`process.env.${n} = ${v};`]),
  ProcessEnvBracket: (g, n, v) => program(g, [`process.env['${n}'] = ${v};`]),
  CdkEnvironment: (_g, n, v) =>
    [
      "import * as lambda from 'aws-cdk-lib/aws-lambda';",
      "import { Stack } from 'aws-cdk-lib';",
      "import { secret } from './secrets';",
      'export class ApiStack extends Stack {',
      '  constructor(scope: any, id: string) {',
      '    super(scope, id);',
      "    new lambda.Function(this, 'Handler', {",
      '      runtime: lambda.Runtime.NODEJS_20_X,',
      "      handler: 'index.handler',",
      "      code: lambda.Code.fromAsset('dist'),",
      `      environment: { ${n}: ${v} },`,
      '    });',
      '  }',
      '}',
      '',
    ].join('\n'),
  SdkVariables: (g, n, v) =>
    program(
      g,
      [
        `await client.send(new UpdateFunctionConfigurationCommand({ FunctionName: 'api', Environment: { Variables: { ${n}: ${v} } } }));`,
      ],
      ['const client = new LambdaClient({});'],
      [
        "import { LambdaClient, UpdateFunctionConfigurationCommand } from '@aws-sdk/client-lambda';",
      ],
    ),
  ServerlessProvider: (_g, n, v) =>
    [
      "import type { AWS } from '@serverless/typescript';",
      "import { secret } from './secrets';",
      'const serverlessConfiguration: AWS = {',
      "  service: 'api',",
      `  provider: { name: 'aws', runtime: 'nodejs20.x', environment: { ${n}: ${v} } },`,
      "  functions: { api: { handler: 'src/api.handler' } },",
      '};',
      'module.exports = serverlessConfiguration;',
      '',
    ].join('\n'),
  RequestPayload: (g, n, v) =>
    program(g, [
      `const payload = { username: 'svc', ${n}: ${v} };`,
      "await fetch('https://partner.example.com/login', { method: 'POST', body: JSON.stringify(payload) });",
    ]),
};

const base = {
  rule: 'no-secrets-in-env',
  // Names 7 x 2 pattern lists; Values 6; Ctxs 6 x 2; Gates 9.
  domain: 14 + 6 + 12 + 9,
  traces: 1000,
  key: (s) =>
    ['focus', 'name', 'custom', 'value', 'ctx', 'gate']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    s.custom ? { additionalPatterns: ['credential'] } : undefined,
  code: (s) =>
    CTX[tag(s.ctx)](tag(s.gate), NAME[tag(s.name)], VALUE[tag(s.value)]),
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
