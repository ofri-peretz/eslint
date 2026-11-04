const { tag, withTestFile } = require('../../lib.cjs');
const { lambdaProgram } = require('../../lambda.cjs');

const BUCKET = "'arn:aws:s3:::my-bucket/uploads/*'";
// The statement's Action/Resource/Principal entries for each field.
const FIELD = {
  ResourceStar: ["Action: 's3:GetObject'", "Resource: '*'"],
  ActionStar: ["Action: '*'", `Resource: ${BUCKET}`],
  ResourceArrayStar: ["Action: ['s3:GetObject']", `Resource: [${BUCKET}, '*']`],
  QuotedResourceStar: ["'Action': 's3:GetObject'", "'Resource': '*'"],
  ScopedResource: ["Action: 's3:GetObject'", `Resource: ${BUCKET}`],
  ScopedTemplate: [
    "Action: 's3:GetObject'",
    'Resource: `arn:aws:s3:::${bucket}/*`',
  ],
  MethodArn: ["Action: 'execute-api:Invoke'", 'Resource: event.methodArn'],
  PrincipalStar: [
    "Principal: '*'",
    "Action: 's3:GetObject'",
    `Resource: ${BUCKET}`,
  ],
  PrincipalAwsStar: [
    "Principal: { AWS: '*' }",
    "Action: 's3:GetObject'",
    `Resource: ${BUCKET}`,
  ],
  PrincipalAccount: [
    "Principal: { AWS: 'arn:aws:iam::123456789012:root' }",
    "Action: 's3:GetObject'",
    `Resource: ${BUCKET}`,
  ],
  PrincipalService: [
    "Principal: { Service: 'lambda.amazonaws.com' }",
    "Action: 'sts:AssumeRole'",
    `Resource: ${BUCKET}`,
  ],
};
const statement = (f, e) => `{ Effect: '${e}', ${FIELD[f].join(', ')} }`;
const IAM =
  "import { IAMClient, PutRolePolicyCommand } from '@aws-sdk/client-iam';";
const put = (doc) =>
  `await iam.send(new PutRolePolicyCommand({ RoleName: 'worker', PolicyName: 'access', PolicyDocument: JSON.stringify(${doc}) }));`;
// Ctx -> [module-level lines, handler body lines]
const CTX = {
  PolicyConst: (st) => [
    [IAM, 'const iam = new IAMClient({});'],
    [
      `const policy = { Version: '2012-10-17', Statement: [${st}] };`,
      put('policy'),
      'return { statusCode: 200 };',
    ],
  ],
  AuthorizerReturn: (st) => [
    [],
    [
      `return { principalId: 'user', policyDocument: { Version: '2012-10-17', Statement: [${st}] } };`,
    ],
  ],
  InlineCommand: (st) => [
    [IAM, 'const iam = new IAMClient({});'],
    [
      put(`{ Version: '2012-10-17', Statement: [${st}] }`),
      'return { statusCode: 200 };',
    ],
  ],
  AddPermission: (_st, f) => [
    [
      "import { LambdaClient, AddPermissionCommand } from '@aws-sdk/client-lambda';",
      'const lambda = new LambdaClient({});',
    ],
    [
      `await lambda.send(new AddPermissionCommand({ FunctionName: 'reports', StatementId: 'public', Action: 'lambda:InvokeFunction', ${f === 'PrincipalStar' ? "Principal: '*'" : "Principal: 'apigateway.amazonaws.com'"} }));`,
      'return { statusCode: 200 };',
    ],
  ],
};

const base = {
  rule: 'no-overly-permissive-iam-policy',
  // Fields 11; Effects 2 x 2; Ctxs 3 x 2 + AddPermission 2; Gates 9 x 2.
  domain: 11 + 4 + 8 + 18,
  traces: 1000,
  key: (s) =>
    ['focus', 'entry', 'effect', 'ctx', 'gate']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  code: (s) => {
    const f = tag(s.entry);
    const [pre, body] = CTX[tag(s.ctx)](statement(f, tag(s.effect)), f);
    return lambdaProgram(tag(s.gate), body, {
      imports: ["import { bucket } from './config';"],
      pre,
    });
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
