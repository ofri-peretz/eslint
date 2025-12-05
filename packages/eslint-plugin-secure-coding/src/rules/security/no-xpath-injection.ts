/**
 * ESLint Rule: no-xpath-injection
 * Detects XPath injection vulnerabilities (CWE-643)
 *
 * XPath injection occurs when user input is improperly inserted into XPath
 * queries, allowing attackers to:
 * - Access unauthorized XML nodes and data
 * - Extract sensitive information from XML documents
 * - Perform XPath-based attacks and data exfiltration
 * - Bypass authentication or authorization checks
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe XPath construction methods
 * - Input validation and sanitization
 * - JSDoc annotations (@xpath-safe, @validated)
 * - Trusted XPath libraries
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
  | 'xpathInjection'
  | 'unsafeXpathConcatenation'
  | 'unvalidatedXpathInput'
  | 'dangerousXpathExpression'
  | 'useParameterizedXpath'
  | 'escapeXpathInput'
  | 'validateXpathQueries'
  | 'strategyParameterizedQueries'
  | 'strategyInputValidation'
  | 'strategySafeConstruction';

export interface Options extends SecurityRuleOptions {
  /** XPath-related function names to check */
  xpathFunctions?: string[];

  /** Functions that safely construct XPath queries */
  safeXpathConstructors?: string[];

  /** Functions that validate/sanitize XPath input */
  xpathValidationFunctions?: string[];
}

type RuleOptions = [Options?];

export const noXpathInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-xpath-injection',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects XPath injection vulnerabilities',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      xpathInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'XPath Injection',
        cwe: 'CWE-643',
        description: 'XPath injection vulnerability detected',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/643.html',
      }),
      unsafeXpathConcatenation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe XPath Concatenation',
        cwe: 'CWE-643',
        description: 'Unsafe string concatenation in XPath expression',
        severity: 'HIGH',
        fix: 'Use parameterized XPath or escape user input',
        documentationLink: 'https://owasp.org/www-community/attacks/XPATH_Injection',
      }),
      unvalidatedXpathInput: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unvalidated XPath Input',
        cwe: 'CWE-643',
        description: 'XPath query uses unvalidated user input',
        severity: 'MEDIUM',
        fix: 'Validate and sanitize XPath input before use',
        documentationLink: 'https://owasp.org/www-community/attacks/XPATH_Injection',
      }),
      dangerousXpathExpression: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dangerous XPath Expression',
        cwe: 'CWE-643',
        description: 'XPath expression allows dangerous operations',
        severity: 'MEDIUM',
        fix: 'Restrict XPath to safe patterns and validate expressions',
        documentationLink: 'https://cwe.mitre.org/data/definitions/643.html',
      }),
      useParameterizedXpath: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Parameterized XPath',
        description: 'Use parameterized XPath queries',
        severity: 'LOW',
        fix: 'Construct XPath with proper escaping and validation',
        documentationLink: 'https://owasp.org/www-community/attacks/XPATH_Injection',
      }),
      escapeXpathInput: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Escape XPath Input',
        description: 'Escape special characters in XPath input',
        severity: 'LOW',
        fix: 'Use xpath.escape() or equivalent escaping function',
        documentationLink: 'https://www.npmjs.com/package/xpath-escape',
      }),
      validateXpathQueries: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate XPath Queries',
        description: 'Validate XPath queries against allowed patterns',
        severity: 'LOW',
        fix: 'Whitelist allowed XPath operations and validate syntax',
        documentationLink: 'https://owasp.org/www-community/attacks/XPATH_Injection',
      }),
      strategyParameterizedQueries: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Parameterized Queries Strategy',
        description: 'Use parameterized XPath construction',
        severity: 'LOW',
        fix: 'Build XPath queries programmatically with escaped parameters',
        documentationLink: 'https://owasp.org/www-community/attacks/XPATH_Injection',
      }),
      strategyInputValidation: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Input Validation Strategy',
        description: 'Validate XPath input at application boundary',
        severity: 'LOW',
        fix: 'Validate XPath syntax and restrict to safe operations',
        documentationLink: 'https://cwe.mitre.org/data/definitions/643.html',
      }),
      strategySafeConstruction: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Safe Construction Strategy',
        description: 'Use safe XPath construction libraries',
        severity: 'LOW',
        fix: 'Use libraries that provide safe XPath building',
        documentationLink: 'https://www.npmjs.com/package/xpath-builder',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          xpathFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['evaluate', 'selectSingleNode', 'selectNodes', 'xpath', 'select'],
          },
          safeXpathConstructors: {
            type: 'array',
            items: { type: 'string' },
            default: ['buildXPath', 'createXPath', 'safeXPath', 'xpathBuilder'],
          },
          xpathValidationFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['validateXPath', 'escapeXPath', 'sanitizeXPath', 'cleanXPath'],
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as XPath sanitizers',
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
      xpathFunctions: ['evaluate', 'selectSingleNode', 'selectNodes', 'xpath', 'select'],
      safeXpathConstructors: ['buildXPath', 'createXPath', 'safeXPath', 'xpathBuilder'],
      xpathValidationFunctions: ['validateXPath', 'escapeXPath', 'sanitizeXPath', 'cleanXPath'],
      trustedSanitizers: [],
      trustedAnnotations: ['@xpath-safe'],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      xpathFunctions = ['evaluate', 'selectSingleNode', 'selectNodes', 'xpath', 'select'],
      safeXpathConstructors = ['buildXPath', 'createXPath', 'safeXPath', 'xpathBuilder'],
      xpathValidationFunctions = ['validateXPath', 'escapeXPath', 'sanitizeXPath', 'cleanXPath'],
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

    // Track variables that have been validated/sanitized
    const validatedVariables = new Set<string>();

    /**
     * Check if this is an XPath-related operation
     */
    const isXpathOperation = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;

      // Check for XPath method calls
      if (callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          xpathFunctions.includes(callee.property.name)) {
        return true;
      }

      // Check for XPath library calls
      if (callee.type === 'Identifier' && xpathFunctions.includes(callee.name)) {
        return true;
      }

      return false;
    };

    /**
     * Check if XPath expression contains dangerous patterns
     */
    const containsDangerousXpath = (xpathText: string): boolean => {
      // Dangerous XPath patterns that allow traversal or injection
      const dangerousPatterns = [
        /\.\./,  // Parent directory traversal
        /\/\*/,  // All children selector
        /\[.*\*\]/,  // Wildcard in predicates
        /\/\//,  // Descendant-or-self axis (can be dangerous in some contexts)
        /text\(\)/,  // Content extraction
        /comment\(\)/,  // Comment extraction
        /processing-instruction\(\)/,  // Processing instruction extraction
      ];

      return dangerousPatterns.some(pattern => pattern.test(xpathText));
    };

    /**
     * Check if string contains XPath interpolation
     */
    const containsXpathInterpolation = (text: string): boolean => {
      return /\$\{[^}]+\}/.test(text) || /'[^']*\+[^+]*'/.test(text) || /"[^"]*\+[^+]*"/.test(text);
    };

    /**
     * Check if XPath input is from untrusted source
     */
    const isUntrustedXpathInput = (inputNode: TSESTree.Node): boolean => {
      if (inputNode.type === 'MemberExpression') {
        // Check patterns like req.query.*, req.body.*, req.params.*
        if (inputNode.object.type === 'MemberExpression' &&
            inputNode.object.object.type === 'Identifier' &&
            inputNode.object.object.name === 'req' &&
            inputNode.object.property.type === 'Identifier' &&
            ['query', 'body', 'params', 'param'].includes(inputNode.object.property.name)) {
          return true;
        }

        // Check patterns like req.*
        if (inputNode.object.type === 'Identifier' && inputNode.object.name === 'req') {
          return true;
        }
      }

      if (inputNode.type !== 'Identifier') {
        return false;
      }

      const varName = inputNode.name.toLowerCase();
      if (['req', 'request', 'query', 'params', 'input', 'user', 'search'].some(keyword =>
        varName.includes(keyword)
      )) {
        return true;
      }

      // Check if it comes from function parameters
      let current: TSESTree.Node | undefined = inputNode;
      while (current) {
        if (current.type === 'FunctionDeclaration' || 
            current.type === 'FunctionExpression' || 
            current.type === 'ArrowFunctionExpression') {
          const func = current as TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression;
          return func.params.some(param => {
            if (param.type === 'Identifier') {
              return param.name === inputNode.name;
            }
            return false;
          });
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    /**
     * Check if XPath input has been validated
     */
    const isXpathInputValidated = (inputNode: TSESTree.Node): boolean => {
      let current: TSESTree.Node | undefined = inputNode;

      while (current) {
        if (current.type === 'CallExpression' &&
            current.callee.type === 'Identifier' &&
            xpathValidationFunctions.includes(current.callee.name)) {
          return true;
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    /**
     * Check for safe annotation on containing statement or variable declaration
     */
    const hasSafeAnnotationOnStatement = (node: TSESTree.Node): boolean => {
      let current: TSESTree.Node | undefined = node;

      // Walk up to find VariableDeclaration, ExpressionStatement, or containing statement
      while (current) {
        if (current.type === 'VariableDeclaration' ||
            current.type === 'ExpressionStatement') {
          // Check for JSDoc comments before this statement
          const comments = sourceCode.getCommentsBefore(current);
          for (const comment of comments) {
            if (comment.type === 'Block' && comment.value.includes('@xpath-safe')) {
              return true;
            }
          }
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    /**
     * Check if XPath is constructed safely
     */
    const isSafeXpathConstruction = (node: TSESTree.Node): boolean => {
      let current: TSESTree.Node | undefined = node;

      while (current) {
        if (current.type === 'CallExpression' &&
            current.callee.type === 'Identifier' &&
            safeXpathConstructors.includes(current.callee.name)) {
          return true;
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    return {
      // Check XPath function calls
      CallExpression(node: TSESTree.CallExpression) {
        if (!isXpathOperation(node)) {
          return;
        }

        const args = node.arguments;
        if (args.length === 0) {
          return;
        }

        // Check first argument (usually the XPath expression)
        const xpathArg = args[0];

        if (xpathArg.type === 'Literal' && typeof xpathArg.value === 'string') {
          const xpathText = xpathArg.value;

          // Check for dangerous XPath patterns
          if (containsDangerousXpath(xpathText)) {
            // FALSE POSITIVE REDUCTION: Skip if annotated as safe
            if (hasSafeAnnotation(xpathArg, context, trustedAnnotations)) {
              return;
            }

            context.report({
              node: xpathArg,
              messageId: 'dangerousXpathExpression',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        } else if (xpathArg.type === 'Identifier') {
          // Check if XPath comes from untrusted input
          if (isUntrustedXpathInput(xpathArg) && !isXpathInputValidated(xpathArg) && 
              !(xpathArg.type === 'Identifier' && validatedVariables.has(xpathArg.name))) {
            // FALSE POSITIVE REDUCTION
            if (hasSafeAnnotation(xpathArg, context, trustedAnnotations) || safetyChecker.isSafe(xpathArg, context)) {
              return;
            }

            context.report({
              node: xpathArg,
              messageId: 'unvalidatedXpathInput',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      },

      // Check template literals for XPath expressions
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        const fullText = sourceCode.getText(node);

        // Check if this looks like an XPath expression
        if (!fullText.includes('/') && !fullText.includes('[') && !fullText.includes('@')) {
          return;
        }

        // Check for interpolation in XPath-like expressions
        if (containsXpathInterpolation(fullText)) {
          // Check if any interpolated values are untrusted
          const hasUntrustedInterpolation = node.expressions.some((expr: TSESTree.Expression) =>
            isUntrustedXpathInput(expr) && !isXpathInputValidated(expr)
          );

          if (hasUntrustedInterpolation) {
            // FALSE POSITIVE REDUCTION: Check for safe annotation
            if (hasSafeAnnotationOnStatement(node)) {
              return;
            }

            context.report({
              node,
              messageId: 'unsafeXpathConcatenation',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
              suggest: [
                {
                  messageId: 'useParameterizedXpath',
                  fix: () => null
                },
              ],
            });
          }
        }

        // Check for dangerous patterns in template literals
        if (containsDangerousXpath(fullText)) {
          // FALSE POSITIVE REDUCTION: Check for safe annotation
          if (hasSafeAnnotationOnStatement(node)) {
            return;
          }

          context.report({
            node,
            messageId: 'dangerousXpathExpression',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }
      },

      // Check binary expressions (string concatenation)
      BinaryExpression(node: TSESTree.BinaryExpression) {
        if (node.operator !== '+') {
          return;
        }

        const fullText = sourceCode.getText(node);

        // Check if this looks like XPath construction
        if (!fullText.includes('/') && !fullText.includes('[')) {
          return;
        }

        // Check if either side contains XPath-like patterns
        const leftText = sourceCode.getText(node.left);
        const rightText = sourceCode.getText(node.right);

        if ((leftText.includes('/') || leftText.includes('[')) ||
            (rightText.includes('/') || rightText.includes('['))) {

          // Check if untrusted input is involved
          const leftUntrusted = isUntrustedXpathInput(node.left) && !isXpathInputValidated(node.left);
          const rightUntrusted = isUntrustedXpathInput(node.right) && !isXpathInputValidated(node.right);

          if (leftUntrusted || rightUntrusted) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'xpathInjection',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
                severity: 'HIGH',
                safeAlternative: 'Use parameterized XPath construction with input validation',
              },
            });
          }
        }
      },

      // Check variable assignments with XPath expressions
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!node.init || node.id.type !== 'Identifier') {
          return;
        }

        const varName = node.id.name;
        
        // Track variables that are assigned the result of sanitization functions
        if (node.init.type === 'CallExpression' &&
            node.init.callee.type === 'Identifier' &&
            (xpathValidationFunctions.includes(node.init.callee.name) || trustedSanitizers.includes(node.init.callee.name))) {
          validatedVariables.add(varName);
        }

        const varNameLower = varName.toLowerCase();
        if (!varNameLower.includes('xpath') && !varNameLower.includes('query') && !varNameLower.includes('path')) {
          return;
        }

        // Check if assigned value contains dangerous XPath
        if (node.init.type === 'Literal' && typeof node.init.value === 'string') {
          if (containsDangerousXpath(node.init.value)) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node.init, context)) {
              return;
            }

            context.report({
              node: node.init,
              messageId: 'dangerousXpathExpression',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        } else if (isUntrustedXpathInput(node.init) && !isSafeXpathConstruction(node.init)) {
          // FALSE POSITIVE REDUCTION
          if (safetyChecker.isSafe(node.init, context)) {
            return;
          }

          context.report({
            node: node.init,
            messageId: 'xpathInjection',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
              severity: 'MEDIUM',
              safeAlternative: 'Use safe XPath construction methods',
            },
          });
        }
      }
    };
  },
});
