const { tag, withTestFile } = require('../../lib.cjs');
const { lambdaProgram } = require('../../lambda.cjs');

const KEY = "'AKIAIOSFODNN7EXAMPLE'";
const SECRET = "'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'";
// [accessKeyId, secretAccessKey] source text; null = the property is absent.
const VALUE = {
  AkiaBoth: [KEY, SECRET],
  AsiaBoth: ["'ASIAIOSFODNN7EXAMPLE'", SECRET],
  AkiaOnly: [KEY, 'process.env.AWS_SECRET_ACCESS_KEY'],
  SecretOnly: ['process.env.AWS_ACCESS_KEY_ID', SECRET],
  TemplateKey: ['`AKIAIOSFODNN7EXAMPLE`', SECRET.replace(/'/g, '`')],
  LocalStack: ["'test'", "'test'"],
  EnvBoth: [
    'process.env.AWS_ACCESS_KEY_ID',
    'process.env.AWS_SECRET_ACCESS_KEY',
  ],
  Provider: null,
  NoCreds: null,
  NonKeyId: ["'my-service-user'", "'short'"],
};
const creds = (v) =>
  v === 'Provider'
    ? 'credentials: fromNodeProviderChain()'
    : v === 'NoCreds'
      ? ''
      : `credentials: { accessKeyId: ${VALUE[v][0]}, secretAccessKey: ${VALUE[v][1]} }`;
const flat = (v) =>
  VALUE[v]
    ? `accessKeyId: ${VALUE[v][0]}, secretAccessKey: ${VALUE[v][1]}`
    : creds(v);
const cfg = (inner) => `{ region: 'us-east-1'${inner ? `, ${inner}` : ''} }`;
// Client tag -> [import lines, the construction for credential value v].
const CLIENT = {
  V3Named: [
    ["import { S3Client } from '@aws-sdk/client-s3';"],
    (v) => `const client = new S3Client(${cfg(creds(v))});`,
  ],
  V3Dynamo: [
    ["import { DynamoDBClient } from '@aws-sdk/client-dynamodb';"],
    (v) => `const client = new DynamoDBClient(${cfg(creds(v))});`,
  ],
  V3Kms: [
    ["import { KMSClient } from '@aws-sdk/client-kms';"],
    (v) => `const client = new KMSClient(${cfg(creds(v))});`,
  ],
  V3Renamed: [
    ["import { S3Client as Storage } from '@aws-sdk/client-s3';"],
    (v) => `const client = new Storage(${cfg(creds(v))});`,
  ],
  V3Namespace: [
    ["import * as s3 from '@aws-sdk/client-s3';"],
    (v) => `const client = new s3.S3Client(${cfg(creds(v))});`,
  ],
  V3Require: [
    ["const { S3Client } = require('@aws-sdk/client-s3');"],
    (v) => `const client = new S3Client(${cfg(creds(v))});`,
  ],
  V2Service: [
    ["import AWS from 'aws-sdk';"],
    (v) => `const client = new AWS.S3(${cfg(flat(v))});`,
  ],
  V2Nested: [
    ["import AWS from 'aws-sdk';"],
    (v) => `const client = new AWS.SQS(${cfg(creds(v))});`,
  ],
  V2DocClient: [
    ["const AWS = require('aws-sdk');"],
    (v) => `const client = new AWS.DynamoDB.DocumentClient(${cfg(flat(v))});`,
  ],
  V2ConfigUpdate: [
    ["import AWS from 'aws-sdk';"],
    (v) => `AWS.config.update(${cfg(flat(v))});`,
  ],
  V2CredentialsCtor: [
    ["import AWS from 'aws-sdk';"],
    (v) =>
      `AWS.config.credentials = new AWS.Credentials(${VALUE[v] ? VALUE[v].join(', ') : ''});`,
  ],
};

const base = {
  rule: 'no-hardcoded-credentials-sdk',
  // Values 10; Clients 11 x 3 values.
  domain: 10 + 33,
  traces: 700,
  key: (s) =>
    ['focus', 'value', 'client'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  code: (s) => {
    const [imports, build] = CLIENT[tag(s.client)];
    return lambdaProgram('ExportConst', ['return { statusCode: 200 };'], {
      imports: [
        ...imports,
        "import { fromNodeProviderChain } from '@aws-sdk/credential-providers';",
      ],
      pre: [build(tag(s.value))],
    });
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
