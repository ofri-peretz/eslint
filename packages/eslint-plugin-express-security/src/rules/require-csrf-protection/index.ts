/**
 * ESLint Rule: require-csrf-protection
 * Detects Express.js routes handling state-changing requests without CSRF protection
 * CWE-352: Cross-Site Request Forgery (CSRF)
 *
 * @see https://cwe.mitre.org/data/definitions/352.html
 * @see https://owasp.org/www-community/attacks/csrf
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';

type MessageIds = 'missingCsrf' | 'addCsrf';

export interface Options {
  /** Allow missing CSRF in test files. Default: false */
  allowInTests?: boolean;

  /** HTTP methods that require CSRF protection. Default: ['post', 'put', 'patch', 'delete'] */
  protectedMethods?: string[];

  /** Route patterns to ignore (e.g., /api/webhook). Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_PROTECTED_METHODS = ['post', 'put', 'patch', 'delete'];

/**
 * Check if a call is a CSRF middleware usage
 */
function isCsrfMiddleware(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;

  // app.use(csrf()) or app.use(csurf())
  if (callee.type === 'Identifier') {
    const name = callee.name.toLowerCase();
    return name === 'csrf' || name === 'csurf' || name === 'csrfprotection';
  }

  // lusca.csrf()
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'lusca' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'csrf'
  ) {
    return true;
  }

  return false;
}

/**
 * Check if route handler has CSRF middleware in its chain
 */
function hasCsrfInMiddlewareChain(
  node: TSESTree.CallExpression,
  sourceCode: TSESLint.SourceCode
): boolean {
  const text = sourceCode.getText(node);
  // Check for csrf/csurf in the middleware chain
  return /\b(csrf|csurf|csrfProtection|csrfMiddleware)\s*\(?\)?/.test(text);
}

/**
 * Known Express app/router variable names
 */
const EXPRESS_IDENTIFIERS = new Set([
  'app',
  'router',
  'api',
  'apiRouter',
  'routes',
  'express',
]);

/**
 * Check if the callee object is likely an Express app or router
 * This prevents false positives on non-Express objects
 */
function isLikelyExpressObject(callee: TSESTree.MemberExpression): boolean {
  const obj = callee.object;

  // Direct identifier: app.post(), router.post()
  if (obj.type === 'Identifier') {
    // Check known Express variable names
    if (EXPRESS_IDENTIFIERS.has(obj.name)) {
      return true;
    }
    // Skip unknown identifiers to avoid FPs
    // Names like 'server', 'customApi', 'controller' are not Express
    /* c8 ignore next */
    return false;
  }

  // Call expression: express().post(), express.Router().post()
  if (obj.type === 'CallExpression') {
    const objCallee = obj.callee;
    
    // express()
    if (objCallee.type === 'Identifier' && objCallee.name === 'express') {
      return true;
    }
    
    // express.Router()
    if (
      objCallee.type === 'MemberExpression' &&
      objCallee.object.type === 'Identifier' &&
      objCallee.object.name === 'express' &&
      objCallee.property.type === 'Identifier' &&
      objCallee.property.name === 'Router'
    ) {
      return true;
    }
  }

  // Member expression: this.app, this.router - skip to avoid FPs
  if (obj.type === 'MemberExpression') {
    /* c8 ignore next */
    return false;
  }

  /* c8 ignore next */
  return false;
}

export const requireCsrfProtection = createRule<RuleOptions, MessageIds>({
  name: 'require-csrf-protection',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require CSRF protection middleware for state-changing HTTP methods',
    },
    hasSuggestions: true,
    messages: {
      missingCsrf: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing CSRF Protection',
        cwe: 'CWE-352',
        description:
          'Route handler for {{method}} request lacks CSRF protection. Attackers can forge requests from malicious sites.',
        severity: 'HIGH',
        fix: "Add CSRF middleware: app.use(csrf()) or use csurf package. Include csrfToken in forms.",
        documentationLink: 'https://owasp.org/www-community/attacks/csrf',
      }),
      addCsrf: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add CSRF Protection',
        description: 'Add CSRF middleware to protect state-changing requests',
        severity: 'LOW',
        fix: "npm install csurf; app.use(csurf({ cookie: true }))",
        documentationLink: 'https://www.npmjs.com/package/csurf',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow missing CSRF in test files',
          },
          protectedMethods: {
            type: 'array',
            items: { type: 'string' },
            default: ['post', 'put', 'patch', 'delete'],
            description: 'HTTP methods that require CSRF protection',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Route patterns to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      protectedMethods: DEFAULT_PROTECTED_METHODS,
      ignorePatterns: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
      allowInTests = false,
      protectedMethods = DEFAULT_PROTECTED_METHODS,
      ignorePatterns = [],
    } = options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;
    let hasGlobalCsrf = false;

    /**
     * Check if route matches ignore patterns
     */
    function shouldIgnoreRoute(routeArg: TSESTree.Node): boolean {
      if (routeArg.type !== 'Literal' || typeof routeArg.value !== 'string') {
        return false;
      }
      const route = routeArg.value;
      return ignorePatterns.some((pattern) => {
        try {
          return new RegExp(pattern).test(route);
        } catch {
          /* c8 ignore next */
          return route.includes(pattern);
        }
      });
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for global app.use(csrf()) or app.use(csrfMiddleware)
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'use'
        ) {
          for (const arg of node.arguments) {
            // app.use(csrf())
            if (arg.type === 'CallExpression' && isCsrfMiddleware(arg)) {
              hasGlobalCsrf = true;
              return;
            }
            // app.use(csrfMiddleware) - variable reference
            if (arg.type === 'Identifier') {
              const name = arg.name.toLowerCase();
              if (name.includes('csrf') || name.includes('csurf')) {
                hasGlobalCsrf = true;
                return;
              }
            }
          }
        }

        // Check for route handlers: app.post(), router.put(), etc.
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier'
        ) {
          const method = callee.property.name.toLowerCase();

          if (!protectedMethods.includes(method)) {
            return;
          }

          // Only flag if this looks like an Express app/router
          // This prevents FPs on non-Express objects like server.post(), customApi.post()
          if (!isLikelyExpressObject(callee)) {
            return;
          }

          // Skip if global CSRF is already set up
          if (hasGlobalCsrf) {
            return;
          }

          // Check if route should be ignored
          const routeArg = node.arguments[0];
          if (routeArg && shouldIgnoreRoute(routeArg)) {
            return;
          }

          // Check if CSRF middleware is in the handler chain
          if (hasCsrfInMiddlewareChain(node, sourceCode)) {
            return;
          }

          // Report missing CSRF
          context.report({
            node,
            messageId: 'missingCsrf',
            data: {
              method: method.toUpperCase(),
            },
            suggest: [
              {
                messageId: 'addCsrf',
                fix: () => null,
              },
            ],
          });
        }
      },
    };
  },
});
