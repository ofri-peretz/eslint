/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-missing-authentication
 * Detects missing authentication checks in route handlers
 * CWE-287: Improper Authentication
 * 
 * @see https://cwe.mitre.org/data/definitions/287.html
 * @see https://owasp.org/www-community/vulnerabilities/Improper_Authentication
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons,
  compileUserPattern,
  compileUserPatterns,
  matchesAnyUserPattern,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'missingAuthentication';

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
 * Routes that are public *by definition*. Requiring authentication on a login or
 * password-reset endpoint is a contradiction — you cannot be authenticated before you
 * authenticate — and a health/metrics probe is called by infrastructure that holds no
 * session. With an empty default every consumer inherited a finding on every one of these.
 *
 * Overridable: passing `ignorePatterns` replaces this list entirely.
 */
const DEFAULT_PUBLIC_ROUTE_PATTERNS = [
  'login',
  'logout',
  'signin',
  'sign-in',
  'signup',
  'sign-up',
  'register',
  'forgot-password',
  'reset-password',
  'password-reset',
  'verify-email',
  'health',
  'healthz',
  'readyz',
  'livez',
  'status',
  'metrics',
  'ping',
  'favicon',
  'webhook',
  '/public/',
  'oauth',
  'callback',
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
        // Not an argument (e.g. `current` is the callee of this call, as in
        // an IIFE) - continue traversing upward. `current.parent` is
        // guaranteed truthy here because the enclosing `if` above already
        // proved it (it matched `current.parent.type === 'CallExpression'`).
        current = current.parent as TSESTree.Node;
        continue;
      }
      
      const callee = callExpr.callee;
      
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
  // The try/catch here already handled an INVALID pattern. It did nothing for a
  // VALID but catastrophic one: `ignorePatterns: ['(a+)+$']` against a 30-char
  // route path took 58.2s on a single file (control: 1.65s), because
  // backtracking explodes inside a regex that compiles perfectly well.
  //
  // compileUserPattern covers both, and hoisting the compile out of the
  // per-call loop is a bonus rather than the point.
  return matchesAnyUserPattern(compileUserPatterns(patterns, 'i'), text);
}

export const noMissingAuthentication = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-authentication',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-missing-authentication.md',
      description: 'Detects missing authentication checks in route handlers',
      cwe: 'CWE-287',
      cvss: 9.8,
    },
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
      ignorePatterns: DEFAULT_PUBLIC_ROUTE_PATTERNS,
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
      ignorePatterns = DEFAULT_PUBLIC_ROUTE_PATTERNS,
    } = options as Options;

    const filename = context.filename;
    // Guarded: a user pattern reaches `new RegExp` here. Measured before this
    // change: `(a+)+$` took 45-58s on a single file, and `[` threw
    // "Invalid regular expression" out of create(), killing the whole lint
    // run rather than just this rule. compileUserPattern degrades both to a
    // substring match.
    const testFileRegex = compileUserPattern(testFilePattern);
    const isTestFile = allowInTests && testFileRegex.test(filename);
    const sourceCode = context.sourceCode;

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
        const object = node.callee.object;
        
        // Only check if the object looks like an Express app/router
        // Must be an identifier like 'app', 'router', 'server', etc.
        if (object.type !== 'Identifier') {
          return; // Skip member chains like db.users.get()
        }
        
        const objectName = object.name.toLowerCase();
        const routerLikeNames = ['app', 'router', 'server', 'route', 'express', 'fastify', 'koa', 'hapi'];
        const looksLikeRouter = routerLikeNames.some(name => objectName.includes(name));
        
        if (!looksLikeRouter) {
          return; // Skip non-router objects like stmt.get(), db.get()
        }
        
        if (property.type === 'Identifier') {
          const methodName = property.name.toLowerCase();
          
          if (routeHandlerPatterns.includes(methodName)) {
            // `app.use(middleware)` with no path mounts GLOBAL middleware — it is not a
            // route handler, so "missing authentication" is meaningless there. Flagging it
            // produced 24 findings across 8 clean fixtures (`app.use(helmet())`,
            // `app.use(rateLimit(...))`, `app.use(express.json())`), the single largest
            // false-positive source in the plugin. Only a PATH-MOUNTED `use` —
            // `app.use('/api', handler)` — addresses a route and can be missing auth.
            if (methodName === 'use') {
              const first = node.arguments[0];
              const mountsAPath =
                first !== undefined &&
                first.type === 'Literal' &&
                typeof first.value === 'string';
              if (!mountsAPath) {
                return;
              }
            }

            // Extract route path if available
            let routePath = 'unknown';
            if (node.arguments.length > 0 && node.arguments[0].type === 'Literal') {
              routePath = String(node.arguments[0].value);
            } else if (node.arguments.length > 0) {
              const pathText = sourceCode.getText(node.arguments[0]);
              routePath = pathText;
            }

            const text = sourceCode.getText(node);
            // These were `console.log('DEBUG MSG: ...')` in shipped code. Any consumer who
            // set `ignorePatterns` got debug lines on stdout, which corrupts the JSON and
            // SARIF formatters. A rule must never write to stdout.
            if (matchesIgnorePattern(routePath, ignorePatterns)) {
              return;
            }
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

              // NOTE: a prior "is this argument a CallExpression whose callee
              // name matches an auth pattern" check was removed as provably
              // redundant: `argText` above is the full source text of `arg`,
              // which for a CallExpression always begins with the callee's
              // own text. Any pattern that matches `calleeName` therefore
              // already matches `argText` and is caught by the check above.

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
              context.report({
                node: node.callee,
                messageId: 'missingAuthentication',
                data: {
                  route: `${methodName}(${routePath})`,
                  method: methodName,
                  path: routePath,
                },
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

