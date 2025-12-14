/**
 * ESLint Rule: no-missing-csrf-protection
 * Detects missing CSRF token validation in POST/PUT/DELETE requests
 * CWE-352: Cross-Site Request Forgery (CSRF)
 * 
 * @see https://cwe.mitre.org/data/definitions/352.html
 * @see https://owasp.org/www-community/attacks/csrf
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'missingCsrfProtection' | 'addCsrfValidation';

export interface Options {
  /** Allow missing CSRF protection in test files. Default: false */
  allowInTests?: boolean;
  
  /** CSRF middleware patterns to recognize. Default: ['csrf', 'csurf', 'csrfProtection', 'verifyCsrfToken'] */
  csrfMiddlewarePatterns?: string[];
  
  /** HTTP methods that require CSRF protection. Default: ['post', 'put', 'delete', 'patch'] */
  protectedMethods?: string[];
  
  /** Additional safe patterns to ignore. Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Default CSRF middleware patterns
 */
const DEFAULT_CSRF_MIDDLEWARE_PATTERNS = [
  'csrf',
  'csurf',
  'csrfProtection',
  'verifyCsrfToken',
  'csrfToken',
  'validateCsrf',
  'checkCsrf',
  'csrfMiddleware',
];

/**
 * Default HTTP methods that require CSRF protection
 */
const DEFAULT_PROTECTED_METHODS = ['post', 'put', 'delete', 'patch'];

/**
 * Check if a route handler method requires CSRF protection
 */
function requiresCsrfProtection(
  methodName: string,
  protectedMethods: string[]
): boolean {
  return protectedMethods.some(method => method.toLowerCase() === methodName.toLowerCase());
}

/**
 * Check if a string matches any ignore pattern
 */
function matchesIgnorePattern(text: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(text);
    } catch {
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
  });
}

export const noMissingCsrfProtection = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-csrf-protection',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects missing CSRF token validation in POST/PUT/DELETE requests',
    },
    hasSuggestions: true,
    messages: {
      missingCsrfProtection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing CSRF Protection',
        cwe: 'CWE-352',
        description: 'Missing CSRF protection detected: {{issue}}',
        severity: 'HIGH',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/352.html',
      }),
      addCsrfValidation: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add CSRF Validation',
        description: 'Add CSRF middleware',
        severity: 'LOW',
        fix: 'app.use(csrf({ cookie: true }))',
        documentationLink: 'https://github.com/expressjs/csurf',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow missing CSRF protection in test files',
          },
          csrfMiddlewarePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'CSRF middleware patterns to recognize',
          },
          protectedMethods: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'HTTP methods that require CSRF protection',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional safe patterns to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      csrfMiddlewarePatterns: [],
      protectedMethods: [],
      ignorePatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      csrfMiddlewarePatterns,
      protectedMethods: customProtectedMethods,
      ignorePatterns = [],
    } = options as Options;

    const csrfPatterns = csrfMiddlewarePatterns && csrfMiddlewarePatterns.length > 0 
      ? csrfMiddlewarePatterns 
      : DEFAULT_CSRF_MIDDLEWARE_PATTERNS;
    
    const protectedMethods = customProtectedMethods && customProtectedMethods.length > 0
      ? customProtectedMethods
      : DEFAULT_PROTECTED_METHODS;

    const filename = context.getFilename();
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);
    const sourceCode = context.sourceCode || context.sourceCode;

    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) {
        return;
      }

      const callee = node.callee;
      const callText = sourceCode.getText(node);
      
      // Check if it matches any ignore pattern
      if (matchesIgnorePattern(callText, ignorePatterns)) {
        return;
      }

      // Check for route handler methods (app.post, router.put, etc.)
      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        const methodName = callee.property.name;
        
        // Only check if it's a route handler that requires CSRF
        if (requiresCsrfProtection(methodName, protectedMethods)) {
          // Must have at least 2 arguments (path and handler)
          if (node.arguments.length < 2) {
            return;
          }
          
          // Check if CSRF middleware is in the route chain arguments
          let hasCsrfInChain = false;
          
          // Check if any argument (after the first path argument) is a CSRF middleware
          // Skip the first argument (path) and check the rest
          for (let i = 1; i < node.arguments.length; i++) {
            const arg = node.arguments[i];
            const argText = sourceCode.getText(arg);
            if (csrfPatterns.some(pattern => argText.toLowerCase().includes(pattern.toLowerCase()))) {
              hasCsrfInChain = true;
              break;
            }
          }
          
          if (!hasCsrfInChain) {
            context.report({
              node,
              messageId: 'missingCsrfProtection',
              data: {
                issue: `${methodName.toUpperCase()} route handler missing CSRF protection`,
                safeAlternative: `Add CSRF middleware: app.${methodName}("/path", csrf(), handler) or use app.use(csrf()) globally`,
              },
              suggest: [
                {
                  messageId: 'addCsrfValidation',
                  fix(fixer: TSESLint.RuleFixer) {
                    // Add CSRF middleware after the first argument (path)
                    const firstArg = node.arguments[0];
                    if (firstArg) {
                      return fixer.insertTextAfter(firstArg, ', csrf()');
                    }
                    return null;
                  },
                },
              ],
            });
          }
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

