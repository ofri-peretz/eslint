/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-hardcoded-credentials-sdk
 * Detects hardcoded AWS credentials in SDK client configurations
 * CWE-798: Use of Hard-coded Credentials
 *
 * @see https://cwe.mitre.org/data/definitions/798.html
 * @see https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/loading-browser-credentials-browser.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  memberPath,
  objectKeyName,
  staticString,
} from '@interlace/eslint-devkit';
import { fileIsLambda } from '../../utils/lambda-evidence';

type MessageIds = 'hardcodedCredentials';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Patterns that indicate AWS access keys
const AWS_ACCESS_KEY_PATTERNS = [
  /^AKIA[0-9A-Z]{16}$/, // IAM user access key
  /^ASIA[0-9A-Z]{16}$/, // STS temporary access key
  /^AIDA[0-9A-Z]{16}$/, // IAM user ID
];

// Property names that indicate credentials
const CREDENTIAL_PROPERTY_NAMES = [
  'accessKeyId',
  'secretAccessKey',
  'sessionToken',
  'awsAccessKeyId',
  'awsSecretAccessKey',
];

// AWS SDK v3 client names
const AWS_SDK_V3_CLIENTS = new Set([
  'S3Client',
  'DynamoDBClient',
  'LambdaClient',
  'SQSClient',
  'SNSClient',
  'SecretsManagerClient',
  'KMSClient',
  'STSClient',
  'IAMClient',
  'EC2Client',
  'ECSClient',
  'CloudWatchClient',
  'CloudWatchLogsClient',
  'APIGatewayClient',
  'CognitoIdentityClient',
  'CognitoIdentityProviderClient',
  'EventBridgeClient',
  'StepFunctionsClient',
  'RDSClient',
  'ElastiCacheClient',
]);

export const noHardcodedCredentialsSdk = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-credentials-sdk',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-lambda-security/docs/rules/no-hardcoded-credentials-sdk.md',
      description:
        'Detects hardcoded AWS credentials in SDK client configurations',
      cwe: 'CWE-798',
      cvss: 9.8,
    },
    messages: {
      hardcodedCredentials: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded AWS Credentials',
        cwe: 'CWE-798',
        description:
          'Hardcoded AWS credentials detected in {{clientName}} config: {{property}}',
        severity: 'CRITICAL',
        fix: 'Use credential provider chain: new {{clientName}}({ credentials: fromNodeProviderChain() })',
        documentationLink:
          'https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
            description: 'Allow hardcoded credentials in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: true,
    },
  ],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    /**
     * Check if a value looks like an AWS access key
     */
    function looksLikeAwsAccessKey(value: string): boolean {
      return AWS_ACCESS_KEY_PATTERNS.some((pattern) => pattern.test(value));
    }

    /**
     * Check if a property name is credential-related
     */
    function isCredentialProperty(name: string): boolean {
      return CREDENTIAL_PROPERTY_NAMES.some(
        (credProp) => name.toLowerCase() === credProp.toLowerCase(),
      );
    }

    /** The variable an identifier refers to, through enclosing scopes. */
    function resolve(id: TSESTree.Identifier) {
      for (
        let scope: TSESLint.Scope.Scope | null =
          context.sourceCode.getScope(id);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.set.get(id.name);
        if (variable) return variable;
      }
      return undefined;
    }

    /**
     * Whether an identifier is bound to the AWS SDK: imported (named, renamed,
     * default or namespace) or required from `aws-sdk` or `@aws-sdk/*`.
     *
     * The name list below only knows the canonical v3 class names, so
     * `import { S3Client as Storage }`, `new s3.S3Client()` and every v2
     * `new AWS.S3()` were invisible to it.
     */
    function isFromAwsSdk(id: TSESTree.Identifier): boolean {
      const def = resolve(id)?.defs[0];
      let source: TSESTree.Node | undefined;
      if (def?.type === 'ImportBinding') {
        source = (def.parent as TSESTree.ImportDeclaration).source;
      } else if (
        def?.type === 'Variable' &&
        def.node.init?.type === AST_NODE_TYPES.CallExpression &&
        def.node.init.callee.type === AST_NODE_TYPES.Identifier &&
        def.node.init.callee.name === 'require'
      ) {
        source = def.node.init.arguments[0];
      }
      const specifier = staticString(source);
      return specifier !== null && /^(aws-sdk|@aws-sdk\/)/.test(specifier);
    }

    /** The root identifier of a member chain: `AWS.DynamoDB.DocumentClient` → `AWS`. */
    function rootIdentifier(node: TSESTree.Node): TSESTree.Identifier | null {
      while (node.type === AST_NODE_TYPES.MemberExpression) node = node.object;
      return node.type === AST_NODE_TYPES.Identifier ? node : null;
    }

    /**
     * Get the AWS client name from the call expression
     * Only match known AWS SDK clients or names ending with 'Client' that look like AWS
     */
    function getAwsClientName(node: TSESTree.NewExpression): string | null {
      if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
        // `new AWS.S3()`, `new s3.S3Client()`, `new AWS.Credentials()`
        const root = rootIdentifier(node.callee);
        return root !== null && isFromAwsSdk(root)
          ? (memberPath(node.callee) ?? [root.name]).join('.')
          : null;
      }
      if (node.callee.type === AST_NODE_TYPES.Identifier) {
        const name = node.callee.name;
        // Known AWS SDK v3 clients
        if (AWS_SDK_V3_CLIENTS.has(name) || isFromAwsSdk(node.callee)) {
          return name;
        }
        // Only match *Client if it looks like AWS (contains common AWS service prefixes)
        if (
          name.endsWith('Client') &&
          /^(S3|DynamoDB|Lambda|SQS|SNS|Secrets|KMS|STS|IAM|EC2|ECS|CloudWatch|APIGateway|Cognito|EventBridge|StepFunctions|RDS|ElastiCache|SSM|Athena|Glue|Kinesis|Firehose|Rekognition|Textract|Comprehend|Polly|Lex|Bedrock|My|Custom|AWS)/i.test(
            name,
          )
        ) {
          return name;
        }
      }
      return null;
    }

    /**
     * Check ObjectExpression for credential properties with hardcoded values
     */
    function checkCredentialsObject(
      obj: TSESTree.ObjectExpression,
      clientName: string,
    ): void {
      for (const prop of obj.properties) {
        if (prop.type !== AST_NODE_TYPES.Property) continue;

        // Check for credentials property
        if (
          prop.key.type === AST_NODE_TYPES.Identifier &&
          prop.key.name === 'credentials' &&
          prop.value.type === AST_NODE_TYPES.ObjectExpression
        ) {
          // Check nested credentials object
          checkCredentialsInner(prop.value, clientName);
        }
      }
      // SDK v2 takes the keys at the top level too: `new AWS.S3({ accessKeyId })`.
      // Judged as the nested object is — a LocalStack `'test'` is not a key.
      checkCredentialsInner(obj, clientName);
    }

    /**
     * Whether a literal credential value is a real one: an access key id in
     * the AKIA/ASIA format, a secret of AWS length, a session token.
     */
    function isHardcoded(property: string, value: string): boolean {
      switch (property.toLowerCase()) {
        case 'accesskeyid':
        case 'awsaccesskeyid':
          return looksLikeAwsAccessKey(value);
        // AWS secrets are 40 chars; short values are LocalStack placeholders.
        case 'secretaccesskey':
        case 'awssecretaccesskey':
          return value.length >= 20;
        default:
          return value.length >= 15;
      }
    }

    /**
     * `new AWS.Credentials(accessKeyId, secretAccessKey, sessionToken)` — the
     * SDK v2 constructor takes the keys positionally.
     */
    function checkPositionalCredentials(
      node: TSESTree.NewExpression,
      clientName: string,
    ): void {
      ['accessKeyId', 'secretAccessKey', 'sessionToken'].forEach((name, i) => {
        const text = staticString(node.arguments[i]);
        if (text !== null && isHardcoded(name, text)) {
          reportHardcodedCredential(node.arguments[i], clientName, name);
        }
      });
    }

    /**
     * Check inner credentials object
     */
    function checkCredentialsInner(
      obj: TSESTree.ObjectExpression,
      clientName: string,
    ): void {
      for (const prop of obj.properties) {
        if (prop.type !== AST_NODE_TYPES.Property) continue;

        // `accessKeyId`, `'accessKeyId'` and `['accessKeyId']` are one key.
        const key = objectKeyName(prop);
        if (key !== null && isCredentialProperty(key)) {
          // Check for literal string values
          const staticText2 = staticString(prop.value);
          if (staticText2 !== null) {
            if (isHardcoded(key, staticText2)) {
              reportHardcodedCredential(prop, clientName, key);
            }
          }
          // Check for template literals (always flag - dynamic construction is suspicious)
          else if (prop.value.type === AST_NODE_TYPES.TemplateLiteral) {
            reportHardcodedCredential(prop, clientName, key);
          }
        }
      }
    }

    /**
     * Report hardcoded credential
     */
    function reportHardcodedCredential(
      node: TSESTree.Node,
      clientName: string,
      propertyName: string,
    ): void {
      context.report({
        node,
        messageId: 'hardcodedCredentials',
        data: {
          clientName,
          property: propertyName,
        },
      });
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        // Every rule here is Lambda-specific, and none of them knew it: over 107,382
        // files, 98% of this plugin's findings were in files with no AWS anything.
        // Registering no visitors is both the gate and the cheap path.
        if (!fileIsLambda(context.sourceCode.ast)) return false;

        const { allowInTests = true } = options as Options;
        const filename = context.filename;
        const isTestFile = isTestFilePath(filename);

        if (allowInTests && isTestFile) {
          return false;
        }
        return true;
      },
      NewExpression(node: TSESTree.NewExpression) {
        const clientName = getAwsClientName(node);
        if (!clientName) return;

        // Check constructor arguments
        if (
          node.arguments.length > 0 &&
          node.arguments[0].type === AST_NODE_TYPES.ObjectExpression
        ) {
          checkCredentialsObject(node.arguments[0], clientName);
        } else if (/(^|\.)Credentials$/.test(clientName)) {
          checkPositionalCredentials(node, clientName);
        }
      },

      // SDK v2 global configuration: `AWS.config.update({ accessKeyId, … })`.
      CallExpression(node: TSESTree.CallExpression) {
        const path = memberPath(node.callee);
        const root = rootIdentifier(node.callee);
        if (
          path?.slice(1).join('.') === 'config.update' &&
          root !== null &&
          isFromAwsSdk(root) &&
          node.arguments[0]?.type === AST_NODE_TYPES.ObjectExpression
        ) {
          checkCredentialsObject(node.arguments[0], `${root.name}.config`);
        }
      },

      // Also check for { credentials: { accessKeyId: ... } } patterns in variable declarations
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.id.type === AST_NODE_TYPES.Identifier &&
          node.id.name.toLowerCase().includes('credential') &&
          node.init?.type === AST_NODE_TYPES.ObjectExpression
        ) {
          checkCredentialsInner(node.init, 'AWSClient');
        }
      },
    };
  },
});
