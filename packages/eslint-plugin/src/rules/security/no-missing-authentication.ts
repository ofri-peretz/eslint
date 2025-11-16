/**
 * ESLint Rule: no-missing-authentication
 * Detects missing authentication checks in route handlers
 * CWE-287: Improper Authentication
 * 
 * @see https://cwe.mitre.org/data/definitions/287.html
 * @see https://owasp.org/www-community/vulnerabilities/Improper_Authentication
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds = 'missingAuthentication' | 'addAuthentication';

export interface Options {
  /** Allow missing authentication in test files. Default: false */
  allowInTests?: boolean;
  
  /** Test file pattern regex string. Default: '\\.(test|spec)\\.(ts|tsx|js|jsx)$' */
  testFilePattern?: string;
  
  /** Authentication middleware patterns to recognize. Default: ['authenticate', 'auth', 'requireAuth', 'isAuthenticated'] */
  authMiddlewarePatterns?: string[];
  
  /** Route handler patterns to check. Default: ['get', 'post', 'put', 'delete', 'patch', 'all'] */
  routeHandlerPatterns?: string[];
  
  /** Additional patterns to ignore. Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Common authentication middleware patterns
 */
const DEFAULT_AUTH_MIDDLEWARE_PATTERNS = [
  'authenticate',
  'auth',
  'requireAuth',
  'isAuthenticated',
  'verifyToken',
  'checkAuth',
  'ensureAuthenticated',
  'passport.authenticate',
  'jwt',
  'session',
];

/**
 * Common route handler patterns
 */
const DEFAULT_ROUTE_HANDLER_PATTERNS = [
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'all',
  'use',
];

/**
 * Check if a node is inside an authentication middleware call
 */
function isInsideAuthMiddleware(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  authPatterns: string[]
): boolean {
  let current: TSESTree.Node | null = node;
  
  while (current) {
    // Check if current is an argument to a CallExpression
    if (current.parent && current.parent.type === 'CallExpression') {
      const callExpr = current.parent as TSESTree.CallExpression;
      
      // Verify that current is actually an argument of this call
      const isArgument = callExpr.arguments.some((arg: TSESTree.CallExpressionArgument) => arg === current);
      if (!isArgument) {
        // Not an argument, continue traversing
        if ('parent' in current && current.parent) {
          current = current.parent as TSESTree.Node;
          continue;
        } else {
          break;
        }
      }
      
      const callee = callExpr.callee;
      const callText = sourceCode.getText(callExpr);
      
      // Check if it's an authentication middleware call
      if (callee.type === 'Identifier') {
        const calleeName = callee.name.toLowerCase();
        if (authPatterns.some(pattern => calleeName.includes(pattern.toLowerCase()))) {
          return true;
        }
      }
      
      // Check if it's a member expression like app.use(auth())
      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        const propertyName = callee.property.name.toLowerCase();
        if (propertyName === 'use' || propertyName === 'all') {
          // Check if any argument is an auth middleware
          for (const arg of callExpr.arguments) {
            const argText = sourceCode.getText(arg);
            if (authPatterns.some(pattern => argText.toLowerCase().includes(pattern.toLowerCase()))) {
              return true;
            }
          }
        }
      }
    }
    
    // Traverse up the AST
    if ('parent' in current && current.parent) {
      current = current.parent as TSESTree.Node;
    } else {
      break;
    }
  }
  
  return false;
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
      // Invalid regex - treat as literal string match
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
  });
}

export const noMissingAuthentication = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-authentication',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects missing authentication checks in route handlers',
    },
    hasSuggestions: true,
    messages: {
      missingAuthentication: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Authentication',
        cwe: 'CWE-287',
        description: 'Route handler missing authentication check: {{route}}',
        severity: 'CRITICAL',
        fix: 'Add authentication middleware: app.{{method}}(\'{{path}}\', authenticate(), handler)',
        documentationLink: 'https://cwe.mitre.org/data/definitions/287.html',
      }),
      addAuthentication: '✅ Add authentication middleware before route handler',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow missing authentication in test files',
          },
          authMiddlewarePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_AUTH_MIDDLEWARE_PATTERNS,
            description: 'Authentication middleware patterns to recognize',
          },
          routeHandlerPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_ROUTE_HANDLER_PATTERNS,
            description: 'Route handler patterns to check',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional patterns to ignore',
          },
          testFilePattern: {
            type: 'string',
            default: '\\.(test|spec)\\.(ts|tsx|js|jsx)$',
            description: 'Test file pattern regex string',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      testFilePattern: '\\.(test|spec)\\.(ts|tsx|js|jsx)$',
      authMiddlewarePatterns: DEFAULT_AUTH_MIDDLEWARE_PATTERNS,
      routeHandlerPatterns: DEFAULT_ROUTE_HANDLER_PATTERNS,
      ignorePatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      testFilePattern = '\\.(test|spec)\\.(ts|tsx|js|jsx)$',
      authMiddlewarePatterns = DEFAULT_AUTH_MIDDLEWARE_PATTERNS,
      routeHandlerPatterns = DEFAULT_ROUTE_HANDLER_PATTERNS,
      ignorePatterns = [],
    } = options as Options;

    const filename = context.getFilename();
    const testFileRegex = new RegExp(testFilePattern);
    const isTestFile = allowInTests && testFileRegex.test(filename);
    const sourceCode = context.sourceCode || context.getSourceCode();

    /**
     * Find variable declaration for an identifier
     */
    function findVariableDeclaration(identifier: TSESTree.Identifier): TSESTree.VariableDeclarator | null {
      const varName = identifier.name;
      let current: TSESTree.Node | null = identifier;
      
      while (current) {
        // Search in current scope
        if (current.type === 'Program' || 
            current.type === 'FunctionDeclaration' || 
            current.type === 'FunctionExpression' || 
            current.type === 'ArrowFunctionExpression') {
          const scopeBody = current.type === 'Program' 
            ? current.body 
            : (current.body.type === 'BlockStatement' ? current.body.body : []);
          
          for (const stmt of scopeBody) {
            if (stmt.type === 'VariableDeclaration') {
              for (const declarator of stmt.declarations) {
                if (declarator.id.type === 'Identifier' && declarator.id.name === varName) {
                  return declarator;
                }
              }
            }
          }
        }
        
        // Traverse up
        if ('parent' in current && current.parent) {
          current = current.parent as TSESTree.Node;
        } else {
          break;
        }
      }
      
      return null;
    }

    /**
     * Check if an identifier was assigned from an auth middleware call
     */
    function isIdentifierFromAuthMiddleware(identifier: TSESTree.Identifier): boolean {
      const declarator = findVariableDeclaration(identifier);
      if (!declarator || !declarator.init) {
        return false;
      }
      
      // Check if init is a CallExpression to auth middleware
      if (declarator.init.type === 'CallExpression' && declarator.init.callee.type === 'Identifier') {
        const calleeName = declarator.init.callee.name.toLowerCase();
        return authMiddlewarePatterns.some(pattern => calleeName.includes(pattern.toLowerCase()));
      }
      
      return false;
    }

    /**
     * Check CallExpression for route handlers without authentication
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) {
        return;
      }

      // Check if it's a route handler call (app.get, router.post, etc.)
      if (node.callee.type === 'MemberExpression') {
        const property = node.callee.property;
        if (property.type === 'Identifier') {
          const methodName = property.name.toLowerCase();
          
          if (routeHandlerPatterns.includes(methodName)) {
            const text = sourceCode.getText(node);
            
            // Check if it matches any ignore pattern
            if (matchesIgnorePattern(text, ignorePatterns)) {
              return;
            }

            // Check if authentication middleware is present in arguments
            let hasAuth = false;
            for (const arg of node.arguments) {
              const argText = sourceCode.getText(arg);
              if (authMiddlewarePatterns.some(pattern => 
                argText.toLowerCase().includes(pattern.toLowerCase())
              )) {
                hasAuth = true;
                break;
              }
              
              // Check if argument is a call to auth middleware
              if (arg.type === 'CallExpression' && arg.callee.type === 'Identifier') {
                const calleeName = arg.callee.name.toLowerCase();
                if (authMiddlewarePatterns.some(pattern => 
                  calleeName.includes(pattern.toLowerCase())
                )) {
                  hasAuth = true;
                  break;
                }
              }
              
              // Check if argument is an identifier assigned from auth middleware
              if (arg.type === 'Identifier' && isIdentifierFromAuthMiddleware(arg)) {
                hasAuth = true;
                break;
              }
            }

            // Check if the handler function itself is inside an auth middleware context
            if (!hasAuth && node.arguments.length > 0) {
              const lastArg = node.arguments[node.arguments.length - 1];
              if (lastArg.type === 'ArrowFunctionExpression' || 
                  lastArg.type === 'FunctionExpression') {
                // Check if the handler is inside an auth middleware call
                if (isInsideAuthMiddleware(lastArg, sourceCode, authMiddlewarePatterns)) {
                  hasAuth = true;
                }
              }
            }

            if (!hasAuth) {
              // Extract route path if available
              let routePath = 'unknown';
              if (node.arguments.length > 0 && node.arguments[0].type === 'Literal') {
                routePath = String(node.arguments[0].value);
              } else if (node.arguments.length > 0) {
                const pathText = sourceCode.getText(node.arguments[0]);
                routePath = pathText;
              }

              context.report({
                node: node.callee,
                messageId: 'missingAuthentication',
                data: {
                  route: `${methodName}(${routePath})`,
                  method: methodName,
                  path: routePath,
                },
                suggest: [
                  {
                    messageId: 'addAuthentication',
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    fix: (_fixer: TSESLint.RuleFixer) => null,
                  },
                ],
              });
            }
          }
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

