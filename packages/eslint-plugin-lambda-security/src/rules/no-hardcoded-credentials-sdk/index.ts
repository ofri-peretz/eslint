/**
 * ESLint Rule: no-hardcoded-credentials-sdk
 * Detects hardcoded AWS credentials in SDK client configurations
 * CWE-798: Use of Hard-coded Credentials
 *
 * @see https://cwe.mitre.org/data/definitions/798.html
 * @see https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/loading-browser-credentials-browser.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'hardcodedCredentials' | 'useCredentialProvider';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Patterns that indicate AWS access keys
const AWS_ACCESS_KEY_PATTERNS = [
  /^AKIA[0-9A-Z]{16}$/,  // IAM user access key
  /^ASIA[0-9A-Z]{16}$/,  // STS temporary access key
  /^AIDA[0-9A-Z]{16}$/,  // IAM user ID
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
const AWS_SDK_V3_CLIENTS = [
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
];

export const noHardcodedCredentialsSdk = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-credentials-sdk',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects hardcoded AWS credentials in SDK client configurations',
    },
    hasSuggestions: true,
    messages: {
      hardcodedCredentials: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded AWS Credentials',
        cwe: 'CWE-798',
        description: 'Hardcoded AWS credentials detected in {{clientName}} config: {{property}}',
        severity: 'CRITICAL',
        fix: 'Use credential provider chain: new {{clientName}}({ credentials: fromNodeProviderChain() })',
        documentationLink: 'https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html',
      }),
      useCredentialProvider: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Credential Provider',
        description: 'Use AWS credential provider chain instead of hardcoded credentials',
        severity: 'LOW',
        fix: 'import { fromNodeProviderChain } from "@aws-sdk/credential-providers"',
        documentationLink: 'https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html',
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
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    /**
     * Check if a value looks like an AWS access key
     */
    function looksLikeAwsAccessKey(value: string): boolean {
      return AWS_ACCESS_KEY_PATTERNS.some(pattern => pattern.test(value));
    }

    /**
     * Check if a property name is credential-related
     */
    function isCredentialProperty(name: string): boolean {
      return CREDENTIAL_PROPERTY_NAMES.some(
        credProp => name.toLowerCase() === credProp.toLowerCase()
      );
    }

    /**
     * Get the AWS client name from the call expression
     * Only match known AWS SDK clients or names ending with 'Client' that look like AWS
     */
    function getAwsClientName(node: TSESTree.NewExpression): string | null {
      if (node.callee.type === AST_NODE_TYPES.Identifier) {
        const name = node.callee.name;
        // Known AWS SDK v3 clients
        if (AWS_SDK_V3_CLIENTS.includes(name)) {
          return name;
        }
        // Only match *Client if it looks like AWS (contains common AWS service prefixes)
        if (name.endsWith('Client') && /^(S3|DynamoDB|Lambda|SQS|SNS|Secrets|KMS|STS|IAM|EC2|ECS|CloudWatch|APIGateway|Cognito|EventBridge|StepFunctions|RDS|ElastiCache|SSM|Athena|Glue|Kinesis|Firehose|Rekognition|Textract|Comprehend|Polly|Lex|Bedrock|My|Custom|AWS)/i.test(name)) {
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
      clientName: string
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

        // Also check top-level credential properties (older pattern)
        if (
          prop.key.type === AST_NODE_TYPES.Identifier &&
          isCredentialProperty(prop.key.name)
        ) {
          if (prop.value.type === AST_NODE_TYPES.Literal && typeof prop.value.value === 'string') {
            reportHardcodedCredential(prop, clientName, prop.key.name);
          }
        }
      }
    }

    /**
     * Check inner credentials object
     */
    function checkCredentialsInner(
      obj: TSESTree.ObjectExpression,
      clientName: string
    ): void {
      for (const prop of obj.properties) {
        if (prop.type !== AST_NODE_TYPES.Property) continue;

        if (prop.key.type === AST_NODE_TYPES.Identifier && isCredentialProperty(prop.key.name)) {
          // Check for literal string values
          if (prop.value.type === AST_NODE_TYPES.Literal && typeof prop.value.value === 'string') {
            const value = prop.value.value;
            const keyName = prop.key.name.toLowerCase();
            
            // For accessKeyId, check if it looks like an actual AWS key (AKIA/ASIA pattern)
            if (keyName === 'accesskeyid') {
              if (looksLikeAwsAccessKey(value)) {
                reportHardcodedCredential(prop, clientName, prop.key.name);
              }
            }
            // For secretAccessKey, require minimum length (AWS secrets are 40+ chars)
            else if (keyName === 'secretaccesskey') {
              if (value.length >= 20) {
                reportHardcodedCredential(prop, clientName, prop.key.name);
              }
            }
            // For sessionToken, any non-short value is suspicious
            else if (keyName === 'sessiontoken') {
              if (value.length >= 15) {
                reportHardcodedCredential(prop, clientName, prop.key.name);
              }
            }
          }
          // Check for template literals (always flag - dynamic construction is suspicious)
          else if (prop.value.type === AST_NODE_TYPES.TemplateLiteral) {
            reportHardcodedCredential(prop, clientName, prop.key.name);
          }
        }
      }
    }

    /**
     * Report hardcoded credential
     */
    function reportHardcodedCredential(
      node: TSESTree.Property,
      clientName: string,
      propertyName: string
    ): void {
      context.report({
        node,
        messageId: 'hardcodedCredentials',
        data: {
          clientName,
          property: propertyName,
        },
        suggest: [
          {
            messageId: 'useCredentialProvider',
            fix: () => null, // Complex fix - just provide suggestion
          },
        ],
      });
    }

    return {
      NewExpression(node: TSESTree.NewExpression) {
        const clientName = getAwsClientName(node);
        if (!clientName) return;

        // Check constructor arguments
        if (node.arguments.length > 0 && node.arguments[0].type === AST_NODE_TYPES.ObjectExpression) {
          checkCredentialsObject(node.arguments[0], clientName);
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
