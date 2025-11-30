/**
 * ESLint Rule: no-missing-security-headers
 * Detects missing security headers in HTTP responses
 * CWE-693: Protection Mechanism Failure
 * 
 * @see https://cwe.mitre.org/data/definitions/693.html
 * @see https://owasp.org/www-project-secure-headers/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'missingSecurityHeader'
  | 'addSecurityHeaders'
  | 'useMiddleware'
  | 'setHeader';

export interface Options {
  /** Required security headers. Default: ['Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options'] */
  requiredHeaders?: string[];
  
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
}

type RuleOptions = [Options?];

const DEFAULT_REQUIRED_HEADERS = [
  'Content-Security-Policy',
  'X-Frame-Options',
  'X-Content-Type-Options',
];

/**
 * Extract header name from setHeader call
 */
function extractHeaderName(node: TSESTree.CallExpression): string | null {
  if (node.arguments.length > 0 && node.arguments[0].type === 'Literal') {
    return String(node.arguments[0].value);
  }
  return null;
}

/**
 * Check if all security headers are set in the current scope
 */
function checkFunctionForSecurityHeaders(
  node: TSESTree.CallExpression,
  requiredHeaders: string[],
  context: TSESLint.RuleContext
): string[] {
  const setHeaders = new Set<string>();

  // Find the function that contains this setHeader call
  let current: TSESTree.Node | null = node;
  let scopeNode: TSESTree.Node | null = null;

  while (current) {
    if (current.type === 'FunctionDeclaration' ||
        current.type === 'FunctionExpression' ||
        current.type === 'ArrowFunctionExpression') {
      scopeNode = current;
      break;
    }
    current = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;
  }

  // If no function found, use the program scope (for test cases)
  if (!scopeNode) {
    scopeNode = context.sourceCode.ast;
  }

  // Collect all setHeader calls in this scope
  function collectHeaders(node: TSESTree.Node): void {
    if (node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        node.callee.property.type === 'Identifier' &&
        ['setHeader', 'header', 'set'].includes(node.callee.property.name)) {
      const headerName = extractHeaderName(node);
      if (headerName) {
        setHeaders.add(headerName);
      }
    }

    // Recursively check children - only traverse standard AST properties
    if (node.type === 'Program' && node.body) {
      node.body.forEach(collectHeaders);
    } else if ((node.type === 'FunctionDeclaration' ||
                node.type === 'FunctionExpression' ||
                node.type === 'ArrowFunctionExpression') && node.body) {
      collectHeaders(node.body);
    } else if (node.type === 'BlockStatement' && node.body) {
      node.body.forEach(collectHeaders);
    } else if (node.type === 'ExpressionStatement' && node.expression) {
      collectHeaders(node.expression);
    }
  }

  collectHeaders(scopeNode);

  // Return missing headers
  return requiredHeaders.filter(header => !setHeaders.has(header));
}

export const noMissingSecurityHeaders = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-security-headers',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects missing security headers in HTTP responses',
    },
    hasSuggestions: true,
    messages: {
      missingSecurityHeader: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing security headers',
        cwe: 'CWE-693',
        description: 'Missing security headers: {{headers}}',
        severity: 'HIGH',
        fix: 'Set security headers: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options',
        documentationLink: 'https://owasp.org/www-project-secure-headers/',
      }),
      addSecurityHeaders: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Security Headers',
        description: 'Add security headers middleware',
        severity: 'LOW',
        fix: 'Add Content-Security-Policy, X-Frame-Options headers',
        documentationLink: 'https://owasp.org/www-project-secure-headers/',
      }),
      useMiddleware: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Helmet',
        description: 'Use helmet.js for security headers',
        severity: 'LOW',
        fix: 'app.use(helmet())',
        documentationLink: 'https://helmetjs.github.io/',
      }),
      setHeader: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Set Headers',
        description: 'Set security headers manually',
        severity: 'LOW',
        fix: 'res.setHeader("X-Frame-Options", "DENY")',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          requiredHeaders: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_REQUIRED_HEADERS,
          },
          ignoreInTests: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      requiredHeaders: DEFAULT_REQUIRED_HEADERS,
      ignoreInTests: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
requiredHeaders = DEFAULT_REQUIRED_HEADERS,
      ignoreInTests = true,
    
}: Options = options || {};

    const filename = context.getFilename();
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const reportedScopes = new Set<string>();

    /**
     * Get a unique key for the current scope
     */
    function getScopeKey(node: TSESTree.CallExpression): string {
      // Find the function that contains this call
      let current: TSESTree.Node | null = node;
      while (current) {
        if (current.type === 'FunctionDeclaration' ||
            current.type === 'FunctionExpression' ||
            current.type === 'ArrowFunctionExpression') {
          return `${current.range?.[0]}-${current.range?.[1]}`;
        }
        current = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      }
      // If no function found, use program scope
      return 'program';
    }

    /**
     * Check for response header setting
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      // Check for res.setHeader, res.header, res.set
      if (node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier') {
        const methodName = node.callee.property.name;
        
        if (['setHeader', 'header', 'set'].includes(methodName)) {
          const scopeKey = getScopeKey(node);

          // Only check once per scope
          if (reportedScopes.has(scopeKey)) {
            return;
          }

          const missing = checkFunctionForSecurityHeaders(node, requiredHeaders, context);
          
          if (missing.length > 0) {
            reportedScopes.add(scopeKey);
            context.report({
              node,
              messageId: 'missingSecurityHeader',
              data: {
                headers: missing.join(', '),
              },
              suggest: [
                {
                  messageId: 'addSecurityHeaders',
                  fix: () => null,
                },
                {
                  messageId: 'useMiddleware',
                  fix: () => null,
                },
                {
                  messageId: 'setHeader',
                  fix: () => null,
                },
              ],
            });
          } else {
            // Mark as checked even if no error
            reportedScopes.add(scopeKey);
          }
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

