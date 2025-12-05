/**
 * ESLint Rule: no-ldap-injection
 * Detects LDAP injection vulnerabilities (CWE-90)
 *
 * LDAP injection occurs when user input is improperly inserted into LDAP
 * queries, allowing attackers to:
 * - Bypass authentication and authorization
 * - Extract sensitive directory information
 * - Perform unauthorized LDAP operations
 * - Enumerate users through blind injection techniques
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe LDAP libraries with built-in escaping
 * - Input validation and sanitization functions
 * - JSDoc annotations (@ldap-safe, @escaped)
 * - Parameterized LDAP query construction
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'ldapInjection'
  | 'unsafeLdapFilter'
  | 'unescapedLdapInput'
  | 'dangerousLdapOperation'
  | 'useLdapEscaping'
  | 'validateLdapInput'
  | 'useParameterizedLdap'
  | 'strategyInputValidation'
  | 'strategySafeLibraries'
  | 'strategyFilterConstruction';

export interface Options extends SecurityRuleOptions {
  /** LDAP-related function names to check */
  ldapFunctions?: string[];

  /** Functions that safely escape LDAP input */
  ldapEscapeFunctions?: string[];

  /** Functions that validate LDAP input */
  ldapValidationFunctions?: string[];

}

type RuleOptions = [Options?];

export const noLdapInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-ldap-injection',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects LDAP injection vulnerabilities',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      ldapInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'LDAP Injection',
        cwe: 'CWE-90',
        description: 'LDAP injection vulnerability detected',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/90.html',
      }),
      unsafeLdapFilter: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe LDAP Filter',
        cwe: 'CWE-90',
        description: 'LDAP filter constructed with unsafe string operations',
        severity: 'HIGH',
        fix: 'Use ldap.escape.filterValue() to escape user input',
        documentationLink: 'https://ldap.com/ldap-filters/',
      }),
      unescapedLdapInput: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unescaped LDAP Input',
        cwe: 'CWE-90',
        description: 'LDAP operation uses unescaped user input',
        severity: 'MEDIUM',
        fix: 'Escape all user input before LDAP operations',
        documentationLink: 'https://cwe.mitre.org/data/definitions/90.html',
      }),
      dangerousLdapOperation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dangerous LDAP Operation',
        cwe: 'CWE-90',
        description: 'LDAP operation allows dangerous filter patterns',
        severity: 'HIGH',
        fix: 'Validate LDAP filters and restrict allowed operations',
        documentationLink: 'https://ldap.com/ldap-filters/',
      }),
      useLdapEscaping: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use LDAP Escaping',
        description: 'Use proper LDAP escaping functions',
        severity: 'LOW',
        fix: 'Use ldap.escape.filterValue() or equivalent',
        documentationLink: 'https://www.npmjs.com/package/ldap-escape',
      }),
      validateLdapInput: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate LDAP Input',
        description: 'Validate LDAP input before processing',
        severity: 'LOW',
        fix: 'Validate input against allowed patterns',
        documentationLink: 'https://cwe.mitre.org/data/definitions/90.html',
      }),
      useParameterizedLdap: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Parameterized LDAP',
        description: 'Use parameterized LDAP queries when possible',
        severity: 'LOW',
        fix: 'Use prepared LDAP statements or safe construction',
        documentationLink: 'https://ldap.com/ldap-filters/',
      }),
      strategyInputValidation: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Input Validation Strategy',
        description: 'Validate LDAP input at application boundary',
        severity: 'LOW',
        fix: 'Implement input validation and length limits',
        documentationLink: 'https://cwe.mitre.org/data/definitions/90.html',
      }),
      strategySafeLibraries: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Safe Libraries Strategy',
        description: 'Use LDAP libraries with built-in escaping',
        severity: 'LOW',
        fix: 'Use ldapjs or libraries with automatic escaping',
        documentationLink: 'https://www.npmjs.com/package/ldapjs',
      }),
      strategyFilterConstruction: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Filter Construction Strategy',
        description: 'Use safe LDAP filter construction methods',
        severity: 'LOW',
        fix: 'Build filters programmatically with escaped values',
        documentationLink: 'https://ldap.com/ldap-filters/',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          ldapFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['search', 'bind', 'modify', 'add', 'delete', 'compare', 'searchAsync'],
          },
          ldapEscapeFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['escape.filterValue', 'escape.dnValue', 'filterEscape', 'dnEscape'],
          },
          ldapValidationFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['validateLdapInput', 'sanitizeLdapFilter', 'cleanLdapValue', 'checkLdapFilter'],
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as LDAP sanitizers',
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
      ldapFunctions: ['search', 'bind', 'modify', 'add', 'delete', 'compare', 'searchAsync'],
      ldapEscapeFunctions: ['escape.filterValue', 'escape.dnValue', 'filterEscape', 'dnEscape'],
      ldapValidationFunctions: ['validateLdapInput', 'sanitizeLdapFilter', 'cleanLdapValue', 'checkLdapFilter'],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      ldapFunctions = ['search', 'bind', 'modify', 'add', 'delete', 'compare', 'searchAsync'],
      ldapEscapeFunctions = ['escape.filterValue', 'escape.dnValue', 'filterEscape', 'dnEscape'],
      ldapValidationFunctions = ['validateLdapInput', 'sanitizeLdapFilter', 'cleanLdapValue', 'checkLdapFilter'],
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
    }: Options = options;

    const sourceCode = context.sourceCode || context.sourceCode;
    const filename = context.filename || context.filename;

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    /**
     * Check if this is an LDAP-related operation
     */
    const isLdapOperation = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;

      // Check for LDAP method calls
      if (callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          ldapFunctions.includes(callee.property.name)) {
        return true;
      }

      return false;
    };

    /**
     * Check if LDAP filter contains dangerous patterns
     */
    const containsDangerousLdapFilter = (filterText: string): boolean => {
      // Dangerous LDAP filter patterns
      const dangerousPatterns = [
        /\*\)$/,     // Ending with *) to match everything
        /\|\)$/,     // Ending with |) for OR operations
        /&\)$/,      // Ending with &) for AND operations
        /!\)$/,      // Ending with !) for NOT operations
        /\*\|\*/,    // *|* pattern for matching everything
        /\*&\*/,     // *&* pattern
        /\*!/,       // NOT operations that could be exploited
      ];

      return dangerousPatterns.some(pattern => pattern.test(filterText));
    };

    /**
     * Check if string contains LDAP filter interpolation
     */
    const containsLdapInterpolation = (text: string): boolean => {
      return /\$\{[^}]+\}/.test(text) || /'[^']*\+[^+]*'/.test(text) || /"[^"]*\+[^+]*"/.test(text);
    };

    /**
     * Check if LDAP input is from untrusted source
     */
    const isUntrustedLdapInput = (inputNode: TSESTree.Node): boolean => {
      // Check member expressions like req.query.name, req.params.id, etc.
      if (inputNode.type === 'MemberExpression') {
        const fullName = sourceCode.getText(inputNode).toLowerCase();
        return fullName.includes('req.') || fullName.includes('request.') ||
               fullName.includes('query.') || fullName.includes('params.') ||
               fullName.includes('body.');
      }

      // In test contexts, also consider certain variable names as potentially untrusted
      if (inputNode.type === 'Identifier') {
        const varName = inputNode.name.toLowerCase();
        return ['userid', 'username', 'userinput', 'input', 'term', 'name', 'search', 'query', 'param', 'password', 'id', 'dn'].includes(varName) ||
               varName.startsWith('user') || varName.startsWith('input') || varName.endsWith('input') ||
               varName.includes('user') || varName.includes('input');
      }

      return false;
    };

    /**
     * Check if LDAP input has been escaped
     */
    const isLdapInputEscaped = (inputNode: TSESTree.Node): boolean => {
      let current: TSESTree.Node | undefined = inputNode;

      while (current) {
        if (current.type === 'CallExpression') {
          const callee = current.callee;

          // Check for escape function calls
          if (callee.type === 'MemberExpression' &&
              callee.property.type === 'Identifier') {
            const propertyName = callee.property.name;
            if (ldapEscapeFunctions.some(escapeFunc =>
              escapeFunc.includes(propertyName) ||
              propertyName.includes('escape')
            )) {
              return true;
            }
          }

          // Check for validation function calls
          if (callee.type === 'Identifier' &&
              ldapValidationFunctions.includes(callee.name)) {
            return true;
          }
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };


    return {
      // Check LDAP function calls
      CallExpression(node: TSESTree.CallExpression) {
        if (!isLdapOperation(node)) {
          return;
        }

        const args = node.arguments;
        if (args.length < 2) {
          return; // Need at least base DN and filter/options
        }

        // Check filter argument (usually the second argument)
        const filterArg = args[1];

        // Check if filter argument comes from untrusted input (like req.query.filter)
        if (isUntrustedLdapInput(filterArg)) {
          // FALSE POSITIVE REDUCTION
          if (safetyChecker.isSafe(filterArg, context)) {
            return;
          }

          context.report({
            node: filterArg,
            messageId: 'unescapedLdapInput',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
            suggest: [
              {
                messageId: 'useLdapEscaping',
                fix: () => null,
              },
            ],
          });
        } else if (filterArg.type === 'TemplateLiteral' && filterArg.expressions.length > 0) {
          // Special handling for template literals with any expressions in LDAP calls
          // This is a more aggressive check for LDAP injection in function calls
          const hasAnyExpression = filterArg.expressions.some(() => true);
          if (hasAnyExpression) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(filterArg, context)) {
              return;
            }

            context.report({
              node: filterArg,
              messageId: 'unescapedLdapInput',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
              suggest: [
                {
                  messageId: 'useLdapEscaping',
                  fix: () => null,
                },
              ],
            });
          }
        }
      },



      // Check variable declarations with LDAP filters
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!node.init || node.id.type !== 'Identifier') {
          return;
        }

        const varName = node.id.name.toLowerCase();
        // Check if variable name suggests LDAP-related content
        const isLdapRelated = varName.includes('filter') || varName.includes('ldap') ||
                             varName.includes('query') || varName.includes('search') ||
                             varName.includes('dn') || varName.includes('bind');

        // If not obviously LDAP-related, check if the assigned value looks like LDAP
        if (!isLdapRelated && node.init) {
          const initText = sourceCode.getText(node.init);
          if (!initText.includes('(') || !initText.includes(')')) {
            return;
          }
        }

        // Check if assigned value contains dangerous LDAP patterns
        if (node.init.type === 'Literal' && typeof node.init.value === 'string') {
          if (containsDangerousLdapFilter(node.init.value)) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node.init, context)) {
              return;
            }

            context.report({
              node: node.init,
              messageId: 'dangerousLdapOperation',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        } else if (node.init.type === 'TemplateLiteral') {
          // Handle template literals with interpolation
          const fullText = sourceCode.getText(node.init);

          // Check for interpolation in LDAP-like expressions
          if (containsLdapInterpolation(fullText)) {
            // Check if any interpolated values are untrusted
            const hasUntrustedInterpolation = node.init.expressions.some((expr: TSESTree.Expression) =>
              isUntrustedLdapInput(expr) && !isLdapInputEscaped(expr)
            );

            if (hasUntrustedInterpolation) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node.init, context)) {
                return;
              }

              context.report({
                node: node.init,
                messageId: 'unsafeLdapFilter',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
                suggest: [
                  {
                    messageId: 'useLdapEscaping',
                    fix: () => null,
                  },
                ],
              });
            }
          }

          // Check for dangerous patterns in template literals
          if (containsDangerousLdapFilter(fullText)) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node.init, context)) {
              return;
            }

            context.report({
              node: node.init,
              messageId: 'dangerousLdapOperation',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        } else if (node.init.type === 'BinaryExpression' && node.init.operator === '+') {
          // Handle string concatenation
          const fullText = sourceCode.getText(node.init);

          // Check if this looks like LDAP filter construction
          if (fullText.includes('(') && fullText.includes(')')) {
            // Check if untrusted input is involved (recursive check)
            const hasUntrustedInput = (expr: TSESTree.Expression): boolean => {
              if (isUntrustedLdapInput(expr) && !isLdapInputEscaped(expr)) {
                return true;
              }
              if (expr.type === 'BinaryExpression' && expr.operator === '+') {
                return hasUntrustedInput(expr.left) || hasUntrustedInput(expr.right);
              }
              return false;
            };

            if (hasUntrustedInput(node.init.left) || hasUntrustedInput(node.init.right)) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node.init, context)) {
                return;
              }

              context.report({
                node: node.init,
                messageId: 'ldapInjection',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                  severity: 'HIGH',
                  safeAlternative: 'Use ldap.escape.filterValue() or parameterized LDAP queries',
                },
                suggest: [
                  {
                    messageId: 'useLdapEscaping',
                    fix: () => null,
                  },
                ],
              });
            }
          }
        } else if (isUntrustedLdapInput(node.init) && !isLdapInputEscaped(node.init)) {
          // FALSE POSITIVE REDUCTION
          if (safetyChecker.isSafe(node.init, context)) {
            return;
          }

          context.report({
            node: node.init,
            messageId: 'ldapInjection',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
              severity: 'MEDIUM',
              safeAlternative: 'Use proper LDAP escaping and validation',
            },
            suggest: [
              {
                messageId: 'useLdapEscaping',
                fix: () => null,
              },
            ],
          });
        }
      }
    };
  },
});
