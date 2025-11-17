/**
 * ESLint Rule: no-hardcoded-credentials
 * Detects hardcoded passwords, API keys, tokens, and other sensitive credentials
 * CWE-798: Use of Hard-coded Credentials
 * 
 * @see https://cwe.mitre.org/data/definitions/798.html
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds = 'hardcodedCredential' | 'useEnvironmentVariable' | 'useSecretManager';

export interface Options {
  /** Patterns to ignore (regex strings). Default: [] */
  ignorePatterns?: string[];
  
  /** Allow credentials in test files. Default: false */
  allowInTests?: boolean;
  
  /** Minimum length for credential detection. Default: 8 */
  minLength?: number;
  
  /** Detect API keys. Default: true */
  detectApiKeys?: boolean;
  
  /** Detect passwords. Default: true */
  detectPasswords?: boolean;
  
  /** Detect tokens. Default: true */
  detectTokens?: boolean;
  
  /** Detect database connection strings. Default: true */
  detectDatabaseStrings?: boolean;
}

type RuleOptions = [Options?];

/**
 * Common credential patterns
 */
const CREDENTIAL_PATTERNS = {
  // API Keys (typically 32+ character alphanumeric strings)
  apiKey: /^(?:[A-Za-z0-9_-]{32,}|sk_[A-Za-z0-9_-]{32,}|pk_[A-Za-z0-9_-]{32,}|AKIA[0-9A-Z]{16})$/,
  
  // JWT Tokens (three base64 parts separated by dots)
  jwtToken: /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
  
  // OAuth tokens
  oauthToken: /^(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{36,}$/,
  
  // AWS Access Keys
  awsAccessKey: /^AKIA[0-9A-Z]{16}$/,
  
  // Database connection strings with credentials
  databaseString: /^(?:mysql|postgres|mongodb|redis):\/\/[^:]+:[^@]+@/,
  
  // Generic password patterns (common weak passwords) - no length requirement
  commonPassword: /^(?:password|admin|123456|qwerty|letmein|welcome|monkey|1234567890|12345678|password123|root|test|guest)$/i,
  
  // Secret keys (base64-like or hex strings)
  secretKey: /^(?:[A-Za-z0-9+/]{32,}={0,2}|[A-Fa-f0-9]{32,})$/,
};

// Note: CREDENTIAL_VARIABLE_NAMES is reserved for future use when we want to
// check variable names in addition to values
// @coverage-note: Not currently used, reserved for future enhancement

/**
 * Check if a string literal looks like a hardcoded credential
 */
function looksLikeCredential(
  value: string,
  options: Required<Pick<Options, 'minLength' | 'detectApiKeys' | 'detectPasswords' | 'detectTokens' | 'detectDatabaseStrings'>>,
  ignorePatterns: RegExp[]
): { isCredential: boolean; type: string } {
  // Check ignore patterns first
  if (ignorePatterns.some(pattern => pattern.test(value))) {
    return { isCredential: false, type: '' };
  }

  // Check passwords (common weak passwords) - no length requirement, check first
  if (options.detectPasswords) {
    if (CREDENTIAL_PATTERNS.commonPassword.test(value)) {
      return { isCredential: true, type: 'Common password' };
    }
  }

  // Check database connection strings - no length requirement
  if (options.detectDatabaseStrings) {
    if (CREDENTIAL_PATTERNS.databaseString.test(value)) {
      return { isCredential: true, type: 'Database connection string' };
    }
  }

  // Check minimum length for other patterns
  if (value.length < options.minLength) {
    return { isCredential: false, type: '' };
  }

  // Check API keys
  if (options.detectApiKeys) {
    if (CREDENTIAL_PATTERNS.apiKey.test(value)) {
      return { isCredential: true, type: 'API key' };
    }
    if (CREDENTIAL_PATTERNS.awsAccessKey.test(value)) {
      return { isCredential: true, type: 'AWS access key' };
    }
  }

  // Check tokens
  if (options.detectTokens) {
    if (CREDENTIAL_PATTERNS.jwtToken.test(value)) {
      return { isCredential: true, type: 'JWT token' };
    }
    if (CREDENTIAL_PATTERNS.oauthToken.test(value)) {
      return { isCredential: true, type: 'OAuth token' };
    }
  }

  // Check secret keys (long base64-like or hex strings)
  if (value.length >= 32 && CREDENTIAL_PATTERNS.secretKey.test(value)) {
    return { isCredential: true, type: 'Secret key' };
  }

  return { isCredential: false, type: '' };
}

// Note: isCredentialVariableName is reserved for future use when we want to
// check variable names in addition to values
// @coverage-note: Not currently used, reserved for future enhancement

export const noHardcodedCredentials = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-credentials',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects hardcoded passwords, API keys, tokens, and other sensitive credentials',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      hardcodedCredential: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hard-coded Credential',
        cwe: 'CWE-798',
        description: 'Hard-coded {{credentialType}} detected',
        severity: 'CRITICAL',
        fix: 'Use environment variable: process.env.{{envVarName}} or secret management service',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      }),
      useEnvironmentVariable: '✅ Use environment variable: process.env.{{envVarName}}',
      useSecretManager: '✅ Use secret manager: AWS Secrets Manager, HashiCorp Vault, or similar',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Regex patterns to ignore',
          },
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow credentials in test files',
          },
          minLength: {
            type: 'number',
            default: 8,
            description: 'Minimum length for credential detection',
          },
          detectApiKeys: {
            type: 'boolean',
            default: true,
            description: 'Detect API keys',
          },
          detectPasswords: {
            type: 'boolean',
            default: true,
            description: 'Detect passwords',
          },
          detectTokens: {
            type: 'boolean',
            default: true,
            description: 'Detect tokens',
          },
          detectDatabaseStrings: {
            type: 'boolean',
            default: true,
            description: 'Detect database connection strings',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignorePatterns: [],
      allowInTests: false,
      minLength: 8,
      detectApiKeys: true,
      detectPasswords: true,
      detectTokens: true,
      detectDatabaseStrings: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
ignorePatterns = [],
      allowInTests = false,
      minLength = 8,
      detectApiKeys = true,
      detectPasswords = true,
      detectTokens = true,
      detectDatabaseStrings = true,
    
}: Options = options || {};

    const filename = context.filename || context.getFilename();
    const isTestFile = allowInTests && (
      filename.includes('.test.') ||
      filename.includes('.spec.') ||
      filename.includes('__tests__') ||
      filename.includes('/test/')
    );

    // Compile ignore patterns to regex
    const compiledIgnorePatterns = ignorePatterns.map((pattern: string) => new RegExp(pattern));

    const detectionOptions = {
      minLength,
      detectApiKeys,
      detectPasswords,
      detectTokens,
      detectDatabaseStrings,
    };

    /**
     * Check a string literal node
     */
    function checkStringLiteral(node: TSESTree.Literal, parent?: TSESTree.Node): void {
      if (typeof node.value !== 'string') {
        return;
      }

      const value = node.value;

      // Skip if in test files and allowed
      if (isTestFile) {
        return;
      }

      // Check if it looks like a credential
      const { isCredential, type } = looksLikeCredential(
        value,
        detectionOptions,
        compiledIgnorePatterns
      );

      if (!isCredential) {
        return;
      }

      // Generate environment variable name suggestion
      let envVarName = 'API_KEY';
      if (parent && parent.type === 'Property' && parent.key.type === 'Identifier') {
        const keyName = parent.key.name;
        envVarName = keyName
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .toUpperCase()
          .replace(/[^A-Z0-9_]/g, '_');
      } else if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
        const varName = parent.id.name;
        envVarName = varName
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .toUpperCase()
          .replace(/[^A-Z0-9_]/g, '_');
      }

      context.report({
        node,
        messageId: 'hardcodedCredential',
        data: {
          credentialType: type,
          envVarName,
        },
        suggest: [
          {
            messageId: 'useEnvironmentVariable',
            data: { envVarName },
            fix: (fixer: TSESLint.RuleFixer) => {
              return fixer.replaceText(node, `process.env.${envVarName} || '${value}'`);
            },
          },
          {
            messageId: 'useSecretManager',
            fix: (fixer: TSESLint.RuleFixer) => {
              return fixer.replaceText(node, `await getSecret('${envVarName.toLowerCase()}')`);
            },
          },
        ],
      });
    }

    return {
      Literal(node: TSESTree.Literal) {
        checkStringLiteral(node, node.parent);
      },
      
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        // Check template literal parts for credentials
        // Only check if there are no interpolations (static template literal)
        if (node.expressions.length === 0) {
          const fullText = node.quasis.map((q: TSESTree.TemplateElement) => q.value.raw).join('');
          const { isCredential, type } = looksLikeCredential(
            fullText,
            detectionOptions,
            compiledIgnorePatterns
          );

          if (isCredential && !isTestFile) {
            context.report({
              node,
              messageId: 'hardcodedCredential',
              data: {
                credentialType: type,
                envVarName: 'API_KEY',
              },
              suggest: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'API_KEY' },
                  fix: (fixer: TSESLint.RuleFixer) => {
                    return fixer.replaceText(node, `process.env.API_KEY || \`${fullText}\``);
                  },
                },
                {
                  messageId: 'useSecretManager',
                  fix: (fixer: TSESLint.RuleFixer) => {
                    return fixer.replaceText(node, `await getSecret('api_key')`);
                  },
                },
              ],
            });
          }
        } else {
          // For template literals with interpolations, check each quasi part
          for (const quasi of node.quasis) {
            if (quasi.value.raw) {
              const { isCredential, type } = looksLikeCredential(
                quasi.value.raw,
                detectionOptions,
                compiledIgnorePatterns
              );

              if (isCredential && !isTestFile) {
                // Note: Template literals with interpolations are complex to fix automatically
                // So we report the error without suggestions
                context.report({
                  node: quasi,
                  messageId: 'hardcodedCredential',
                  data: {
                    credentialType: type,
                    envVarName: 'API_KEY',
                  },
                });
              }
            }
          }
        }
      },
    };
  },
});

