/**
 * ESLint Rule: no-insecure-jwt
 * Detects insecure JWT operations including algorithm confusion, weak keys,
 * and missing signature verification (CWE-347)
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe JWT libraries (jsonwebtoken, jose, etc.)
 * - Proper algorithm specifications
 * - Signature verification calls
 * - JSDoc annotations (@verified, @validated)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  hasSafeAnnotation,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'insecureJwtAlgorithm'
  | 'missingSignatureVerification'
  | 'weakJwtSecret'
  | 'jwtWithoutValidation'
  | 'unsafeJwtParsing'
  | 'useSecureJwtLibrary'
  | 'verifyBeforeTrust'
  | 'strategyUseVerifiedLibrary'
  | 'strategyValidateAlgorithm'
  | 'strategyStrongSecrets';

export interface Options extends SecurityRuleOptions {
  /** Allow specific insecure algorithms for legacy compatibility. Default: [] (strict) */
  allowedInsecureAlgorithms?: string[];

  /** Minimum key length for HMAC secrets. Default: 32 (256 bits) */
  minSecretLength?: number;

  /** JWT libraries to consider safe. Default: jsonwebtoken, jose, jwt */
  trustedJwtLibraries?: string[];
}

type RuleOptions = [Options?];

export const noInsecureJwt = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-jwt',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects insecure JWT operations and missing signature verification',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      insecureJwtAlgorithm: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure JWT Algorithm',
        cwe: 'CWE-347',
        description: 'JWT algorithm confusion vulnerability',
        severity: 'CRITICAL',
        fix: 'Use RS256/ES256 and validate algorithm before verification',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
      missingSignatureVerification: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing JWT Signature Verification',
        cwe: 'CWE-347',
        description: 'JWT parsed without signature verification',
        severity: 'CRITICAL',
        fix: 'Use jwt.verify() instead of jwt.decode()',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
      weakJwtSecret: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak JWT Secret',
        cwe: 'CWE-347',
        description: 'JWT signed with weak/insufficient secret',
        severity: 'HIGH',
        fix: 'Use minimum 256-bit secret (32+ characters)',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
      jwtWithoutValidation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'JWT Without Validation',
        cwe: 'CWE-347',
        description: 'JWT used without proper validation',
        severity: 'HIGH',
        fix: 'Verify JWT signature before trusting payload',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
      unsafeJwtParsing: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe JWT Parsing',
        cwe: 'CWE-347',
        description: 'Unsafe JWT parsing pattern detected',
        severity: 'MEDIUM',
        fix: 'Use verified JWT libraries with proper error handling',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
      useSecureJwtLibrary: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Secure JWT Library',
        description: 'Use jsonwebtoken or jose library',
        severity: 'LOW',
        fix: 'npm install jsonwebtoken && use jwt.verify()',
        documentationLink: 'https://www.npmjs.com/package/jsonwebtoken',
      }),
      verifyBeforeTrust: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Verify Before Trust',
        description: 'Always verify JWT signature before using payload',
        severity: 'LOW',
        fix: 'jwt.verify(token, secret, callback)',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
      strategyUseVerifiedLibrary: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Verified Library Strategy',
        description: 'Use battle-tested JWT libraries',
        severity: 'LOW',
        fix: 'Use jsonwebtoken, jose, or jwt libraries',
        documentationLink: 'https://www.npmjs.com/package/jsonwebtoken',
      }),
      strategyValidateAlgorithm: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Algorithm Validation Strategy',
        description: 'Validate algorithms before use',
        severity: 'LOW',
        fix: 'Whitelist allowed algorithms: ["RS256", "ES256"]',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
      strategyStrongSecrets: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Strong Secrets Strategy',
        description: 'Use cryptographically strong secrets',
        severity: 'LOW',
        fix: 'Generate 256-bit secrets: crypto.randomBytes(32)',
        documentationLink: 'https://nodejs.org/api/crypto.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedInsecureAlgorithms: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          minSecretLength: {
            type: 'number',
            minimum: 16,
            default: 32,
          },
          trustedJwtLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: ['jsonwebtoken', 'jose', 'jwt'],
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as JWT validators',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional JSDoc annotations to consider as safe markers',
          },
          strictMode: {
            type: 'boolean',
            default: false,
            description: 'Disable all false positive detection (strict mode)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowedInsecureAlgorithms: [],
      minSecretLength: 32,
      trustedJwtLibraries: ['jsonwebtoken', 'jose', 'jwt'],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      minSecretLength = 32,
      trustedJwtLibraries = ['jsonwebtoken', 'jose', 'jwt'],
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
    }: Options = options;

    const sourceCode = context.sourceCode || context.sourceCode;
    const filename = context.filename || context.getFilename();

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    /**
     * Check if secret/key is weak
     */
    const isWeakSecret = (secretNode: TSESTree.Node): boolean => {
      if (secretNode.type === 'Literal' && typeof secretNode.value === 'string') {
        return secretNode.value.length < minSecretLength;
      }
      return false; // Can't determine strength of non-literal secrets
    };

    /**
     * Check if JWT operation has signature verification
     */
    const hasSignatureVerification = (jwtCall: TSESTree.CallExpression): boolean => {
      // Check if it's jwt.verify() call
      if (
        jwtCall.callee.type === 'MemberExpression' &&
        jwtCall.callee.property.type === 'Identifier' &&
        jwtCall.callee.property.name === 'verify'
      ) {
        return true;
      }

      // Check for @verified annotation
      return hasSafeAnnotation(jwtCall, context, trustedAnnotations);
    };

    /**
     * Check if this is a trusted JWT library call
     */
    const isTrustedJwtLibrary = (node: TSESTree.CallExpression): boolean => {
      // Check if callee is a member expression (library.method)
      if (node.callee.type !== 'MemberExpression') {
        return false;
      }

      // Check if the object is a JWT library
      const object = node.callee.object;
      if (object.type === 'Identifier') {
        return trustedJwtLibraries.includes(object.name.toLowerCase());
      }

      return false;
    };

    /**
     * Extract JWT-related information from a call
     */
    const extractJwtInfo = (node: TSESTree.CallExpression) => {
      const sourceText = sourceCode.getText(node);

      // Check for algorithm specification
      const hasAlgorithmSpec = /\b(algorithms?|alg)\s*:/i.test(sourceText);

      // Check for insecure patterns
      const hasNoneAlgorithm = /\b(alg|algorithms?)\s*:\s*['"`]\s*none\s*['"`]/i.test(sourceText);
      const hasWeakAlgorithm = /\b(alg|algorithms?)\s*:\s*['"`]\s*(HS256|HS384|HS512)\s*['"`]/i.test(sourceText);

      return {
        sourceText,
        hasAlgorithmSpec,
        hasNoneAlgorithm,
        hasWeakAlgorithm,
        isDecodeCall: /\bdecode\b/i.test(sourceText),
        isVerifyCall: /\bverify\b/i.test(sourceText),
      };
    };

    return {
      // Check JWT library method calls
      CallExpression(node: TSESTree.CallExpression) {
        if (!isTrustedJwtLibrary(node)) {
          return;
        }

        const jwtInfo = extractJwtInfo(node);

        // CRITICAL: Algorithm confusion attack (alg: "none")
        if (jwtInfo.hasNoneAlgorithm) {
          context.report({
            node,
            messageId: 'insecureJwtAlgorithm',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
          return;
        }

        // HIGH: Weak algorithm without proper key validation
        if (jwtInfo.hasWeakAlgorithm && node.arguments.length >= 2) {
          const secretArg = node.arguments[1];
          if (isWeakSecret(secretArg)) {
            context.report({
              node,
              messageId: 'weakJwtSecret',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
            return;
          }
        }

        // CRITICAL: Using jwt.decode() instead of jwt.verify()
        if (jwtInfo.isDecodeCall && !jwtInfo.isVerifyCall) {
          // FALSE POSITIVE REDUCTION: Skip if annotated as safe
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node,
            messageId: 'missingSignatureVerification',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
            suggest: [
              {
                messageId: 'verifyBeforeTrust',
                fix: () => null // Could be complex to auto-fix
              },
            ],
          });
        }
      },

      // Check for JWT-related variable declarations and assignments
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!node.init || node.init.type !== 'CallExpression') {
          return;
        }

        const initCall = node.init;
        if (!isTrustedJwtLibrary(initCall)) {
          return;
        }

        const jwtInfo = extractJwtInfo(initCall);

        // Variable assigned with unverified JWT data
        if (jwtInfo.isDecodeCall && !jwtInfo.isVerifyCall) {
          // FALSE POSITIVE REDUCTION
          if (safetyChecker.isSafe(initCall, context)) {
            return;
          }

          context.report({
            node,
            messageId: 'jwtWithoutValidation',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }
      },

      // Check for JWT token usage without verification
      Identifier(node: TSESTree.Identifier) {
        // Look for JWT-related patterns in comments and strings
        const parent = node.parent;

        // Check string literals containing JWT patterns
        if (parent?.type === 'Literal' && typeof parent.value === 'string') {
          const value = parent.value;

          // Look for JWT patterns in strings
          if (value.includes('eyJ') && value.split('.').length === 3) { // JWT structure
            // Check if this JWT is used unsafely
            let current: TSESTree.Node | undefined = parent;
            let isVerified = false;

            // Walk up to find if this is within a verified JWT operation
            while (current && !isVerified) {
              if (current.type === 'CallExpression' && hasSignatureVerification(current)) {
                isVerified = true;
                break;
              }
              current = current.parent as TSESTree.Node;
            }

            if (!isVerified && !safetyChecker.isSafe(parent, context)) {
              context.report({
                node: parent,
                messageId: 'unsafeJwtParsing',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }
      }
    };
  },
});
