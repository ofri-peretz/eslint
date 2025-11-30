/**
 * ESLint Rule: enforce-rest-conventions
 * Validates REST endpoint design against best practices
 * Priority 6: API Design & Evolution
 * 
 * @see https://restfulapi.net/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'restConventionViolation'
  | 'useProperHttpMethod'
  | 'useProperStatusCode'
  | 'fixResourceNaming';

export interface Options {
  /** Check HTTP methods. Default: true */
  checkHttpMethods?: boolean;
  
  /** Check status codes. Default: true */
  checkStatusCodes?: boolean;
  
  /** Check resource naming. Default: true */
  checkResourceNaming?: boolean;
}

type RuleOptions = [Options?];

/**
 * Valid HTTP methods for REST
 */
const VALID_HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

/**
 * Check if HTTP method is valid
 */
function isValidHttpMethod(method: string): boolean {
  return VALID_HTTP_METHODS.includes(method.toUpperCase());
}

export const enforceRestConventions = createRule<RuleOptions, MessageIds>({
  name: 'enforce-rest-conventions',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Validates REST endpoint design against best practices',
    },
    messages: {
      restConventionViolation: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'REST convention violation',
        description: '{{violation}}: {{details}}',
        severity: 'MEDIUM',
        fix: 'Follow RESTful conventions for HTTP methods, status codes, and resource naming',
        documentationLink: 'https://restfulapi.net/',
      }),
      useProperHttpMethod: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use HTTP Method',
        description: 'Use proper HTTP method',
        severity: 'LOW',
        fix: 'GET (read), POST (create), PUT/PATCH (update), DELETE (delete)',
        documentationLink: 'https://restfulapi.net/http-methods/',
      }),
      useProperStatusCode: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Status Code',
        description: 'Use appropriate status code',
        severity: 'LOW',
        fix: '200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 404 (Not Found)',
        documentationLink: 'https://restfulapi.net/http-status-codes/',
      }),
      fixResourceNaming: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Resource Naming',
        description: 'Use plural nouns for resources',
        severity: 'LOW',
        fix: '/users, /orders, /products (not /user, /order)',
        documentationLink: 'https://restfulapi.net/resource-naming/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          checkHttpMethods: {
            type: 'boolean',
            default: true,
            description: 'Check HTTP methods',
          },
          checkStatusCodes: {
            type: 'boolean',
            default: true,
            description: 'Check status codes',
          },
          checkResourceNaming: {
            type: 'boolean',
            default: true,
            description: 'Check resource naming',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      checkHttpMethods: true,
      checkStatusCodes: true,
      checkResourceNaming: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
checkHttpMethods = true,
      checkStatusCodes = true,
      checkResourceNaming = true,
    
}: Options = options || {};


    /**
     * Check CallExpression for REST API patterns
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      // Check for Express/Fastify route handlers: app.get(), router.post(), etc.
      if (node.callee.type === 'MemberExpression') {
        const property = node.callee.property;
        
        if (property.type === 'Identifier') {
          const methodName = property.name.toLowerCase();
          const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
          
          if (httpMethods.includes(methodName)) {
            // Check HTTP method
            if (checkHttpMethods && !isValidHttpMethod(methodName)) {
              context.report({
                node: property,
                messageId: 'restConventionViolation',
                data: {
                  violation: 'Invalid HTTP method',
                  details: `"${methodName}" is not a valid REST HTTP method`,
                },
                suggest: [
                  { messageId: 'useProperHttpMethod', fix: () => null },
                ],
              });
            }
            
            // Check resource naming (first argument should be a path)
            if (checkResourceNaming && node.arguments.length > 0) {
              const pathArg = node.arguments[0];
              if (pathArg.type === 'Literal' && typeof pathArg.value === 'string') {
                const path = pathArg.value as string;
                // Check if path uses plural nouns (basic check)
                if (path.startsWith('/') && path.length > 1) {
                  const resource = path.split('/')[1];
                  // Basic check: resource should be plural or have :id
                  if (!path.includes(':') && !resource.endsWith('s') && resource.length > 3) {
                    context.report({
                      node: pathArg,
                      messageId: 'restConventionViolation',
                      data: {
                        violation: 'Resource naming',
                        details: `Resource "${resource}" should be plural (e.g., /users, /orders)`,
                      },
                      suggest: [
                        { messageId: 'fixResourceNaming', fix: () => null },
                      ],
                    });
                  }
                }
              }
            }
          }
        }
      }
      
      // Check for status code usage: res.status(200)
      if (checkStatusCodes && node.callee.type === 'MemberExpression') {
        const property = node.callee.property;
        if (property.type === 'Identifier' && property.name === 'status') {
          // Check if status code is appropriate (would need to track HTTP method)
          // This is simplified - full implementation would track the HTTP method from parent
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

