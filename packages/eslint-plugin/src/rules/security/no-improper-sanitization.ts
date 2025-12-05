/**
 * ESLint Rule: no-improper-sanitization
 * Detects improper sanitization of user input (CWE-94, CWE-79, CWE-116)
 *
 * Improper sanitization occurs when user input is not properly cleaned
 * before use in sensitive contexts. This can lead to injection attacks,
 * XSS, or other security vulnerabilities.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Known safe sanitization patterns
 * - Trusted sanitization libraries
 * - JSDoc annotations (@sanitized, @safe)
 * - Context-aware validation
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@forge-js/eslint-plugin-utils';

type MessageIds =
  | 'improperSanitization'
  | 'insufficientXssProtection'
  | 'incompleteHtmlEscaping'
  | 'unsafeReplaceSanitization'
  | 'missingContextEncoding'
  | 'dangerousSanitizerUsage'
  | 'sqlInjectionSanitization'
  | 'commandInjectionSanitization'
  | 'useProperSanitization'
  | 'validateSanitization'
  | 'implementContextAware'
  | 'strategyDefenseInDepth'
  | 'strategyInputValidation'
  | 'strategyOutputEncoding';

export interface Options extends SecurityRuleOptions {
  /** Safe sanitization functions */
  safeSanitizers?: string[];

  /** Characters that should be escaped */
  dangerousChars?: string[];

  /** Contexts that require different encoding */
  contexts?: string[];

  /** Trusted sanitization libraries */
  trustedLibraries?: string[];
}

type RuleOptions = [Options?];

export const noImproperSanitization = createRule<RuleOptions, MessageIds>({
  name: 'no-improper-sanitization',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects improper sanitization of user input',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      improperSanitization: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Improper Sanitization',
        cwe: 'CWE-116',
        description: 'User input sanitization is insufficient or incorrect',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/116.html',
      }),
      insufficientXssProtection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insufficient XSS Protection',
        cwe: 'CWE-79',
        description: 'XSS protection is incomplete or missing',
        severity: 'HIGH',
        fix: 'Use comprehensive XSS prevention or trusted sanitization library',
        documentationLink: 'https://owasp.org/www-community/attacks/xss/',
      }),
      incompleteHtmlEscaping: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Incomplete HTML Escaping',
        cwe: 'CWE-116',
        description: 'HTML escaping misses dangerous characters',
        severity: 'MEDIUM',
        fix: 'Escape all HTML special characters: & < > " \'',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
      }),
      unsafeReplaceSanitization: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Replace Sanitization',
        cwe: 'CWE-116',
        description: 'Simple replace() calls are insufficient for sanitization',
        severity: 'MEDIUM',
        fix: 'Use comprehensive sanitization libraries',
        documentationLink: 'https://cwe.mitre.org/data/definitions/116.html',
      }),
      missingContextEncoding: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Context Encoding',
        cwe: 'CWE-116',
        description: 'Output encoding missing for specific context',
        severity: 'MEDIUM',
        fix: 'Encode output according to usage context (HTML, URL, SQL, etc.)',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
      }),
      dangerousSanitizerUsage: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dangerous Sanitizer Usage',
        cwe: 'CWE-94',
        description: 'Custom sanitizer may be incomplete or bypassable',
        severity: 'LOW',
        fix: 'Use well-tested sanitization libraries',
        documentationLink: 'https://cwe.mitre.org/data/definitions/94.html',
      }),
      sqlInjectionSanitization: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SQL Injection Sanitization',
        cwe: 'CWE-89',
        description: 'SQL input sanitization is insufficient',
        severity: 'HIGH',
        fix: 'Use parameterized queries instead of sanitization',
        documentationLink: 'https://owasp.org/www-community/attacks/SQL_Injection',
      }),
      commandInjectionSanitization: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Command Injection Sanitization',
        cwe: 'CWE-78',
        description: 'Command input sanitization is insufficient',
        severity: 'CRITICAL',
        fix: 'Avoid shell commands with user input, use safe APIs',
        documentationLink: 'https://owasp.org/www-community/attacks/Command_Injection',
      }),
      useProperSanitization: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Proper Sanitization',
        description: 'Use proper sanitization methods for each context',
        severity: 'LOW',
        fix: 'HTML: DOMPurify, URL: encodeURIComponent, SQL: parameterized queries',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html',
      }),
      validateSanitization: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Sanitization',
        description: 'Validate that sanitization is effective',
        severity: 'LOW',
        fix: 'Test sanitization with malicious inputs',
        documentationLink: 'https://cwe.mitre.org/data/definitions/116.html',
      }),
      implementContextAware: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Implement Context Aware Sanitization',
        description: 'Use different sanitization for different contexts',
        severity: 'LOW',
        fix: 'HTML context: escape <>&"\' , URL context: encodeURIComponent',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
      }),
      strategyDefenseInDepth: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Defense in Depth Strategy',
        description: 'Implement multiple layers of input validation',
        severity: 'LOW',
        fix: 'Validate input, sanitize output, use CSP, implement rate limiting',
        documentationLink: 'https://owasp.org/www-community/controls/Defense_in_depth',
      }),
      strategyInputValidation: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Input Validation Strategy',
        description: 'Validate input at multiple layers',
        severity: 'LOW',
        fix: 'Client-side, server-side, and database-level validation',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html',
      }),
      strategyOutputEncoding: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Output Encoding Strategy',
        description: 'Encode output according to context',
        severity: 'LOW',
        fix: 'Use appropriate encoding for HTML, JavaScript, CSS, URL contexts',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          safeSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: ['DOMPurify.sanitize', 'he.encode', 'encodeURIComponent', 'encodeURI', 'escape'],
          },
          dangerousChars: {
            type: 'array',
            items: { type: 'string' },
            default: ['<', '>', '"', "'", '&', '`', '$', '{', '}', '|', ';', '(', ')'],
          },
          contexts: {
            type: 'array',
            items: { type: 'string' },
            default: ['html', 'url', 'sql', 'command', 'javascript', 'css'],
          },
          trustedLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: ['DOMPurify', 'he', 'validator', 'express-validator'],
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as sanitizers',
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
      safeSanitizers: ['DOMPurify.sanitize', 'he.encode', 'encodeURIComponent', 'encodeURI', 'escape'],
      dangerousChars: ['<', '>', '"', "'", '&', '`', '$', '{', '}', '|', ';', '(', ')'],
      contexts: ['html', 'url', 'sql', 'command', 'javascript', 'css'],
      trustedLibraries: ['DOMPurify', 'he', 'validator', 'express-validator'],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      safeSanitizers = ['DOMPurify.sanitize', 'he.encode', 'encodeURIComponent', 'encodeURI', 'escape'],
      dangerousChars = ['<', '>', '"', "'", '&', '`', '$', '{', '}', '|', ';', '(', ')'],
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
     * Check if sanitization is safe
     */
    const isSafeSanitizer = (callText: string): boolean => {
      return safeSanitizers.some(sanitizer => callText.includes(sanitizer));
    };

    /**
     * Check if replace sanitization is incomplete
     */
    const isIncompleteReplaceSanitization = (callExpression: TSESTree.CallExpression): boolean => {
      const callText = sourceCode.getText(callExpression);

      // Check for incomplete HTML escaping
      if (callText.includes('replace(/</g, "&lt;")') ||
          callText.includes('replace(/>/g, "&gt;")')) {
        // If only escaping < and > but not other dangerous chars, it's incomplete
        const hasQuoteEscaping = callText.includes('&quot;') || callText.includes('&#x27;');
        const hasAmpersandEscaping = callText.includes('&amp;');

        return !(hasQuoteEscaping && hasAmpersandEscaping);
      }

      return false;
    };

    /**
     * Check if output context suggests needed encoding
     */
    const needsContextEncoding = (outputNode: TSESTree.Node): string | null => {
      let current: TSESTree.Node | undefined = outputNode;

      // Look for context clues in surrounding code
      while (current) {
        const text = sourceCode.getText(current).toLowerCase();

        if (text.includes('innerhtml') || text.includes('outerhtml')) {
          return 'html';
        }
        if (text.includes('href') || text.includes('src') || text.includes('url')) {
          return 'url';
        }
        if (text.includes('sql') || text.includes('query') || text.includes('execute')) {
          return 'sql';
        }
        if (text.includes('exec') || text.includes('spawn') || text.includes('command')) {
          return 'command';
        }

        current = current.parent as TSESTree.Node;
      }

      return null;
    };

    return {
      // Check call expressions for sanitization issues
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for replace() sanitization
        if (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'replace') {

          if (isIncompleteReplaceSanitization(node)) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'incompleteHtmlEscaping',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }

        // Check for custom sanitizer functions
        if (callee.type === 'Identifier') {
          const functionName = callee.name;

          // Check if it's a known dangerous sanitizer pattern
          if (functionName.toLowerCase().includes('sanitize') ||
              functionName.toLowerCase().includes('escape') ||
              functionName.toLowerCase().includes('clean')) {

            // If it's not in our safe list, flag it
            if (!safeSanitizers.some(safe => functionName.includes(safe))) {
              // Check if arguments contain user input
              const args = node.arguments;
              let hasUserInput = false;

              for (const arg of args) {
                const argText = sourceCode.getText(arg).toLowerCase();
                if (argText.includes('req.') || argText.includes('body') ||
                    argText.includes('query') || argText.includes('params') ||
                    argText.includes('input') || argText.includes('data')) {
                  hasUserInput = true;
                  break;
                }
              }

              if (hasUserInput) {
                // FALSE POSITIVE REDUCTION
                if (safetyChecker.isSafe(node, context)) {
                  return;
                }

                context.report({
                  node,
                  messageId: 'dangerousSanitizerUsage',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                  },
                });
              }
            }
          }
        }
      },

      // Check assignments that might need sanitization
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        const left = node.left;
        const right = node.right;

        // Check for assignments to potentially dangerous properties
        if (left.type === 'MemberExpression' &&
            left.property.type === 'Identifier') {

          const propertyName = left.property.name.toLowerCase();

          if (['innerhtml', 'outerhtml', 'innertext', 'textcontent'].includes(propertyName)) {
            const encodingContext = needsContextEncoding(node);

            if (encodingContext === 'html' && propertyName === 'innerhtml') {
              // Check if right side is properly sanitized
              const rightText = sourceCode.getText(right);

              if (!isSafeSanitizer(rightText)) {
                // Check if right side contains user input
                const hasUserInput = rightText.includes('req.') ||
                                   rightText.includes('body') ||
                                   rightText.includes('query') ||
                                   rightText.includes('input');

                if (hasUserInput) {
                  // FALSE POSITIVE REDUCTION
                  if (safetyChecker.isSafe(node, context)) {
                    return;
                  }

                  context.report({
                    node: right,
                    messageId: 'insufficientXssProtection',
                    data: {
                      filePath: filename,
                      line: String(node.loc?.start.line ?? 0),
                    },
                  });
                }
              }
            }
          }
        }
      },

      // Check string literals that might contain dangerous characters
      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== 'string') {
          return;
        }

        const text = node.value;

        // Check if this string is used in a dangerous context
        let current: TSESTree.Node | undefined = node;
        let isInDangerousContext = false;

        while (current && !isInDangerousContext) {
          if (current.type === 'AssignmentExpression') {
            const left = current.left;
            if (left.type === 'MemberExpression' &&
                left.property.type === 'Identifier' &&
                ['innerHTML', 'outerHTML'].includes(left.property.name)) {
              isInDangerousContext = true;
              break;
            }
          } else if (current.type === 'CallExpression') {
            const callee = current.callee;
            if (callee.type === 'MemberExpression' &&
                callee.property.type === 'Identifier' &&
                ['write', 'send', 'json'].includes(callee.property.name)) {
              // Could be response output
              isInDangerousContext = true;
              break;
            }
          }
          current = current.parent as TSESTree.Node;
        }

        if (isInDangerousContext) {
          // Check if string contains dangerous characters without proper escaping
          const hasDangerousChars = dangerousChars.some(char => text.includes(char));
          const hasEscaping = text.includes('&lt;') || text.includes('&gt;') ||
                            text.includes('&quot;') || text.includes('&#x27;') ||
                            text.includes('&amp;');

          if (hasDangerousChars && !hasEscaping) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'unsafeReplaceSanitization',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      }
    };
  },
});
