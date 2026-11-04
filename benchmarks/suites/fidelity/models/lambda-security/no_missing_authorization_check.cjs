const { tag, withTestFile } = require('../../lib.cjs');
const { lambdaProgram } = require('../../lambda.cjs');

const FORBIDDEN = "  return { statusCode: 403, body: 'Forbidden' };";
const AUTH = {
  NoAuth: [],
  CognitoClaims: [
    'const claims = event.requestContext?.authorizer?.claims;',
    'if (!claims?.sub) {',
    FORBIDDEN,
    '}',
  ],
  JwtV2: [
    'const caller = event.requestContext?.authorizer?.jwt?.claims;',
    'if (!caller) {',
    FORBIDDEN,
    '}',
  ],
  IamIdentity: [
    'if (!event.requestContext?.identity?.userArn) {',
    FORBIDDEN,
    '}',
  ],
  VerifyHeader: [
    'const user = await verifyToken(event.headers.authorization);',
    'if (!user) {',
    "  return { statusCode: 401, body: 'Unauthorized' };",
    '}',
  ],
  BodySubject: [
    "const body = JSON.parse(event.body ?? '{}');",
    "console.log('purging', body.subject);",
  ],
  BodyUserId: ["console.log('purging', event.pathParameters?.userId);"],
};
// [module-level setup, the operation]
const OP = {
  DbDelete: [[], "await db.query('DELETE FROM users');"],
  DynamoSend: [
    [
      "import { DynamoDBClient, DeleteItemCommand } from '@aws-sdk/client-dynamodb';",
      'const ddb = new DynamoDBClient({});',
    ],
    "await ddb.send(new DeleteItemCommand({ TableName: 'users', Key: { pk: { S: 'all' } } }));",
  ],
  DocDelete: [
    [
      "const AWS = require('aws-sdk');",
      'const docClient = new AWS.DynamoDB.DocumentClient();',
    ],
    "await docClient.delete({ TableName: 'users', Key: { pk: 'all' } }).promise();",
  ],
  S3Put: [
    ["import AWS from 'aws-sdk';", 'const s3 = new AWS.S3();'],
    "await s3.putObject({ Bucket: 'site', Key: 'index.html', Body: 'x' }).promise();",
  ],
  LambdaInvoke: [
    [
      "import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';",
      'const lambda = new LambdaClient({});',
    ],
    "await lambda.send(new InvokeCommand({ FunctionName: 'purge-users' }));",
  ],
  Compute: [[], 'const total = [1, 2, 3].reduce((a, b) => a + b, 0);'],
  MapDelete: [['const cache = new Map();'], "cache.delete('users');"],
};

const base = {
  rule: 'no-missing-authorization-check',
  // Ops 7 x 2 auths; Auths 7; Gates 9; Files 3.
  domain: 14 + 7 + 9 + 3,
  traces: 800,
  key: (s) =>
    ['focus', 'op', 'auth', 'gate', 'file']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    tag(s.file) === 'PlainFile'
      ? undefined
      : { handlerPatterns: ['handlers/'] },
  filename: (s) =>
    tag(s.file) === 'PatternMiss'
      ? 'src/lib/purge.ts'
      : 'src/handlers/purge.ts',
  code: (s) => {
    const [setup, op] = OP[tag(s.op)];
    return lambdaProgram(
      tag(s.gate),
      [...AUTH[tag(s.auth)], op, "return { statusCode: 204, body: '' };"],
      {
        imports: ["import { db, verifyToken } from './deps';"],
        pre: setup,
      },
    );
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`. The test file
// keeps its directory, so `handlerPatterns` still sees the same path.
const wrapped = withTestFile(base, { option: 'allowInTests', flip: false });
module.exports = {
  ...wrapped,
  filename: (s) =>
    tag(s.testCtx) === 'Prod'
      ? base.filename(s)
      : base.filename(s).replace(/\.ts$/, '.test.ts'),
};
