/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-hardcoded-credentials
 * Detects hardcoded passwords, API keys, tokens, and other sensitive credentials
 * CWE-798: Use of Hard-coded Credentials
 * 
 * @see https://cwe.mitre.org/data/definitions/798.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'useEnvironmentVariable' | 'useSecretManager' | 'strategyEnv' | 'strategyConfig' | 'strategyVault' | 'strategyAuto';

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

  /** Custom credential patterns. Default: [] */
  customPatterns?: Array<{
    /** The type of credential (e.g., 'API key', 'token', 'password') */
    type: string;
    /** Regex pattern to match */
    pattern: string;
  }>;

  /** Strategy for fixing hardcoded credentials: 'env', 'config', 'vault', 'auto' */
  strategy?: 'env' | 'config' | 'vault' | 'auto';
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
  options: Required<Pick<Options, 'minLength' | 'detectApiKeys' | 'detectPasswords' | 'detectTokens' | 'detectDatabaseStrings' | 'customPatterns'>>,
  ignorePatterns: RegExp[]
): { isCredential: boolean; type: string } {
  // Check ignore patterns first
  if (ignorePatterns.some(pattern => pattern.test(value))) {
    return { isCredential: false, type: '' };
  }

  // Check custom patterns first (highest priority)
  for (const customPattern of options.customPatterns) {
    try {
      const regex = new RegExp(customPattern.pattern);
      if (regex.test(value)) {
        return { isCredential: true, type: customPattern.type };
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Invalid regex pattern, skip it
      continue;
    }
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

  // Check tokens first (more specific patterns)
  if (options.detectTokens) {
    if (CREDENTIAL_PATTERNS.jwtToken.test(value)) {
      return { isCredential: true, type: 'JWT token' };
    }
    if (CREDENTIAL_PATTERNS.oauthToken.test(value)) {
      return { isCredential: true, type: 'OAuth token' };
    }
  }

  // Check secret keys first (before generic API key patterns)
  if (value.length >= 32 && CREDENTIAL_PATTERNS.secretKey.test(value)) {
    return { isCredential: true, type: 'Secret key' };
  }

  // Check API keys
  if (options.detectApiKeys) {
    if (CREDENTIAL_PATTERNS.awsAccessKey.test(value)) {
      return { isCredential: true, type: 'AWS access key' };
    }
    // Generic API key pattern (long alphanumeric strings)
    if (/^[A-Za-z0-9_-]{32,}$/.test(value)) {
      return { isCredential: true, type: 'API key' };
    }
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
      useEnvironmentVariable: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hard-coded Credential',
        cwe: 'CWE-798',
        description: 'Hard-coded {{credentialType}} detected',
        severity: 'CRITICAL',
        fix: 'Use environment variable: process.env.{{envVarName}} or secret management service',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      }),
      useSecretManager: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Use Secret Manager',
        cwe: 'CWE-798',
        description: 'Use secure secret management service',
        severity: 'HIGH',
        fix: 'Use AWS Secrets Manager, HashiCorp Vault, Azure Key Vault, or similar',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      }),
      strategyEnv: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'Environment Variable Strategy',
        description: 'Move credentials to environment variables',
        severity: 'MEDIUM',
        fix: 'Store credentials in environment variables (process.env)',
        documentationLink: 'https://12factor.net/config',
      }),
      strategyConfig: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'Configuration File Strategy',
        description: 'Store credentials in encrypted configuration files',
        severity: 'MEDIUM',
        fix: 'Use encrypted configuration files with proper access controls',
        documentationLink: 'https://owasp.org/www-project-cheat-sheets/cheatsheets/Configuration_Management_Cheat_Sheet.html',
      }),
      strategyVault: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Secret Vault Strategy',
        cwe: 'CWE-798',
        description: 'Use dedicated secret management system',
        severity: 'HIGH',
        fix: 'Implement HashiCorp Vault, AWS Secrets Manager, or similar secret vault',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      }),
      strategyAuto: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'Context-Aware Strategy',
        description: 'Apply context-aware credential management',
        severity: 'MEDIUM',
        fix: 'Choose strategy based on deployment environment and security requirements',
        documentationLink: 'https://owasp.org/www-project-cheat-sheets/cheatsheets/Secrets_Management_Cheat_Sheet.html',
      }),
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
          customPatterns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'The type of credential (e.g., "API key", "token")',
                },
                pattern: {
                  type: 'string',
                  description: 'Regex pattern to match',
                },
              },
              required: ['type', 'pattern'],
              additionalProperties: false,
            },
            default: [],
            description: 'Custom credential patterns to detect',
          },
          strategy: {
            type: 'string',
            enum: ['env', 'config', 'vault', 'auto'],
            default: 'auto',
            description: 'Strategy for fixing hardcoded credentials (auto = smart detection)'
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
      customPatterns: [],
      strategy: 'auto',
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
      customPatterns = [],
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
      customPatterns,
    };


    /**
     * Variable / property names that hold UI labels and HTML attribute
     * values, not secrets. When a literal containing the word "password"
     * (or other credential-like text) lives in one of these contexts, it's
     * a label or form-field metadata, not a hardcoded credential.
     */
    const LABEL_CONTEXT_NAMES = new Set<string>([
      // HTML form attributes
      'type', 'name', 'id', 'placeholder', 'label', 'title', 'role',
      'autocomplete', 'autoFocus', 'autocapitalize', 'inputmode',
      // ARIA
      'aria-label', 'aria-labelledby', 'aria-describedby',
      // Common semantic UI fields
      'fieldName', 'fieldType', 'fieldLabel', 'inputType', 'inputName',
      'displayName', 'columnName', 'paramName',
      // i18n keys / translation lookup. NOTE: bare `'key'` is intentionally
      // omitted — `const key = '...'` is the canonical name for actual API
      // keys (e.g. AWS, Stripe), so exempting it would mask real secrets.
      // The specific i18n names below cover translation lookups without
      // that false-negative.
      'i18nKey', 'translationKey', 'messageKey',
    ]);

    /**
     * Returns true if the literal is being used as a UI label or HTML
     * attribute value rather than as a secret. Examples:
     *   const label = 'password';                        // variable named `label`
     *   input.type = 'password';                          // assigning to .type
     *   input.name = 'userPassword';                      // assigning to .name
     *   <input type="password" />                         // JSX attribute
     *   { type: 'password', name: 'pw' }                  // object literal property
     *   setAttribute('placeholder', 'Enter password')     // setAttribute call
     */
    function isLabelContext(node: TSESTree.Literal, parent?: TSESTree.Node): boolean {
      if (!parent) return false;

      // const label = 'password' / let label = 'password'
      if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
        const n = (parent.id as TSESTree.Identifier).name.toLowerCase();
        if (LABEL_CONTEXT_NAMES.has(n) || n.endsWith('label') || n.endsWith('name') || n.endsWith('placeholder')) return true;
      }

      // input.type = 'password' / input.name = 'userPassword'
      if (parent.type === 'AssignmentExpression' && (parent as TSESTree.AssignmentExpression).right === node) {
        const left = (parent as TSESTree.AssignmentExpression).left;
        if (left.type === 'MemberExpression' && left.property.type === 'Identifier') {
          if (LABEL_CONTEXT_NAMES.has((left.property as TSESTree.Identifier).name)) return true;
        }
      }

      // { type: 'password', name: 'foo' }
      if (parent.type === 'Property' && (parent as TSESTree.Property).value === node) {
        const key = (parent as TSESTree.Property).key;
        if (key.type === 'Identifier' && LABEL_CONTEXT_NAMES.has((key as TSESTree.Identifier).name)) return true;
        if (key.type === 'Literal' && typeof (key as TSESTree.Literal).value === 'string') {
          if (LABEL_CONTEXT_NAMES.has((key as TSESTree.Literal).value as string)) return true;
        }
      }

      // setAttribute('type', 'password') — second arg is the value
      if (
        parent.type === 'CallExpression' &&
        (parent as TSESTree.CallExpression).callee.type === 'MemberExpression' &&
        ((parent as TSESTree.CallExpression).callee as TSESTree.MemberExpression).property.type === 'Identifier'
      ) {
        const callee = (parent as TSESTree.CallExpression).callee as TSESTree.MemberExpression;
        const methodName = (callee.property as TSESTree.Identifier).name;
        if (methodName === 'setAttribute' || methodName === 'getAttribute') {
          const args = (parent as TSESTree.CallExpression).arguments;
          if (args[1] === node) return true;
        }
      }

      // JSX: <input type="password" />
      if (parent.type === 'JSXAttribute' as unknown as string) return true;

      return false;
    }

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

      // Skip if used as a UI label / HTML attribute value (form-field name,
      // type tag, ARIA label, i18n key) — these aren't credentials.
      if (isLabelContext(node, parent)) {
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
        messageId: 'useEnvironmentVariable',
        data: {
          credentialType: type,
          envVarName,
        },
        suggest: [
          {
            messageId: 'useEnvironmentVariable',
            data: { envVarName, credentialType: type },
            fix: (fixer: TSESLint.RuleFixer) => {
              return fixer.replaceText(node, `process.env.${envVarName} || '${value}'`);
            },
          },
          {
            messageId: 'useSecretManager',
            data: { credentialType: type },
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
              messageId: 'useEnvironmentVariable',
              data: {
                credentialType: type,
                envVarName: 'API_KEY',
              },
              suggest: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'API_KEY', credentialType: type },
                  fix: (fixer: TSESLint.RuleFixer) => {
                    return fixer.replaceText(node, `process.env.API_KEY || \`${fullText}\``);
                  },
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: type },
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
                  messageId: 'useEnvironmentVariable',
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

