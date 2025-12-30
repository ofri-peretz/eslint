/**
 * ESLint Rule: no-user-controlled-requests
 * Detects HTTP requests with user-controlled URLs (SSRF)
 * CWE-918: Server-Side Request Forgery (SSRF)
 *
 * @see https://cwe.mitre.org/data/definitions/918.html
 * @see https://owasp.org/www-community/attacks/Server_Side_Request_Forgery
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'ssrfVulnerability' | 'useAllowlist';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// HTTP client function/method names
const HTTP_CLIENT_METHODS = [
  // Built-in
  'fetch',
  // Node.js http module
  'request',
  'get',
  'post',
  'put',
  'delete',
  'patch',
  // Axios
  'axios',
  // got
  'got',
  // node-fetch
  'nodeFetch',
  // superagent
  'superagent',
];

// HTTP client objects with methods
const HTTP_CLIENT_OBJECTS = ['http', 'https', 'axios', 'got', 'request'];

// Event properties containing user input
const USER_INPUT_PROPERTIES = [
  'body',
  'queryStringParameters',
  'pathParameters',
  'multiValueQueryStringParameters',
  'headers',
  'rawPath',
  'rawQueryString',
];

// Lambda event parameter names
const EVENT_PARAM_NAMES = ['event', 'evt', 'e', 'request', 'req'];

export const noUserControlledRequests = createRule<RuleOptions, MessageIds>({
  name: 'no-user-controlled-requests',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Detects HTTP requests with user-controlled URLs (SSRF vulnerability)',
    },
    hasSuggestions: true,
    messages: {
      ssrfVulnerability: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Server-Side Request Forgery (SSRF)',
        cwe: 'CWE-918',
        owasp: 'SAS-8',
        cvss: 9.1,
        description:
          'HTTP request URL contains user-controlled input from {{source}}. Attackers can access internal services or exfiltrate data.',
        severity: 'CRITICAL',
        fix: 'Validate URL against allowlist before making request. Never use user input directly in URLs.',
        documentationLink:
          'https://owasp.org/www-community/attacks/Server_Side_Request_Forgery',
      }),
      useAllowlist: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use URL Allowlist',
        description: 'Implement an allowlist for permitted URL domains/hosts',
        severity: 'LOW',
        fix: "const ALLOWED_HOSTS = ['api.trusted.com']; if (!ALLOWED_HOSTS.includes(new URL(url).host)) throw new Error('Invalid URL')",
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
            description: 'Allow user-controlled URLs in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: true,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    // Track event parameters
    const eventParameters = new Set<string>();
    // Track variables that contain user input
    const taintedVariables = new Map<string, string>(); // variable name -> source

    /**
     * Check if an identifier is an event parameter
     */
    function isEventParameter(name: string): boolean {
      return eventParameters.has(name);
    }

    /**
     * Check if a member expression accesses user input from event
     */
    function getEventInputSource(
      node: TSESTree.MemberExpression,
    ): string | null {
      // event.body, event.queryStringParameters, etc.
      if (
        node.object.type === AST_NODE_TYPES.Identifier &&
        isEventParameter(node.object.name) &&
        node.property.type === AST_NODE_TYPES.Identifier &&
        USER_INPUT_PROPERTIES.includes(node.property.name)
      ) {
        return `event.${node.property.name}`;
      }

      // event.queryStringParameters.url, event.body.targetUrl, etc.
      if (
        node.object.type === AST_NODE_TYPES.MemberExpression &&
        node.object.object.type === AST_NODE_TYPES.Identifier &&
        isEventParameter(node.object.object.name) &&
        node.object.property.type === AST_NODE_TYPES.Identifier &&
        USER_INPUT_PROPERTIES.includes(node.object.property.name)
      ) {
        return `event.${node.object.property.name}.${
          node.property.type === AST_NODE_TYPES.Identifier
            ? node.property.name
            : '[...]'
        }`;
      }

      return null;
    }

    /**
     * Get taint source from an expression
     */
    function getTaintSource(node: TSESTree.Node): string | null {
      // Direct event property access
      if (node.type === AST_NODE_TYPES.MemberExpression) {
        const source = getEventInputSource(node);
        if (source) return source;
      }

      // Variable that was previously tainted
      if (node.type === AST_NODE_TYPES.Identifier) {
        const source = taintedVariables.get(node.name);
        if (source) return source;
      }

      // Template literal with tainted content
      if (node.type === AST_NODE_TYPES.TemplateLiteral) {
        for (const expr of node.expressions) {
          const source = getTaintSource(expr);
          if (source) return source;
        }
      }

      // Binary expression (string concatenation)
      if (node.type === AST_NODE_TYPES.BinaryExpression) {
        const leftSource = getTaintSource(node.left);
        if (leftSource) return leftSource;
        const rightSource = getTaintSource(node.right);
        if (rightSource) return rightSource;
      }

      return null;
    }

    /**
     * Check if this is an HTTP client call
     */
    function isHttpClientCall(node: TSESTree.CallExpression): boolean {
      // fetch(url), axios(url), got(url)
      if (
        node.callee.type === AST_NODE_TYPES.Identifier &&
        HTTP_CLIENT_METHODS.includes(node.callee.name)
      ) {
        return true;
      }

      // axios.get(url), http.request(url), etc.
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.object.type === AST_NODE_TYPES.Identifier &&
        HTTP_CLIENT_OBJECTS.includes(node.callee.object.name)
      ) {
        return true;
      }

      // axios.create().get(url) - chained methods
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        ['get', 'post', 'put', 'delete', 'patch', 'request'].includes(
          node.callee.property.name,
        )
      ) {
        return true;
      }

      return false;
    }

    /**
     * Check if URL argument is user-controlled
     */
    function checkUrlArgument(
      node: TSESTree.CallExpression,
    ): { tainted: boolean; source: string } | null {
      if (node.arguments.length === 0) return null;

      const urlArg = node.arguments[0];
      const source = getTaintSource(urlArg);

      if (source) {
        return { tainted: true, source };
      }

      // Check object config { url: taintedVar }
      if (urlArg.type === AST_NODE_TYPES.ObjectExpression) {
        for (const prop of urlArg.properties) {
          if (
            prop.type === AST_NODE_TYPES.Property &&
            prop.key.type === AST_NODE_TYPES.Identifier &&
            ['url', 'uri', 'href', 'baseURL'].includes(prop.key.name)
          ) {
            const propSource = getTaintSource(prop.value);
            if (propSource) {
              return { tainted: true, source: propSource };
            }
          }
        }
      }

      return null;
    }

    return {
      // Track event parameters in handlers
      'ArrowFunctionExpression, FunctionExpression, FunctionDeclaration'(
        node:
          | TSESTree.ArrowFunctionExpression
          | TSESTree.FunctionExpression
          | TSESTree.FunctionDeclaration,
      ) {
        for (const param of node.params) {
          if (param.type === AST_NODE_TYPES.Identifier) {
            if (EVENT_PARAM_NAMES.includes(param.name)) {
              eventParameters.add(param.name);
            }
          }
        }
      },

      // Track variable assignments that contain user input
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type === AST_NODE_TYPES.Identifier && node.init) {
          const source = getTaintSource(node.init);
          if (source) {
            taintedVariables.set(node.id.name, source);
          }
        }
      },

      // Track reassignments
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.left.type === AST_NODE_TYPES.Identifier) {
          const source = getTaintSource(node.right);
          if (source) {
            taintedVariables.set(node.left.name, source);
          }
        }
      },

      // Check HTTP client calls for tainted URLs
      CallExpression(node: TSESTree.CallExpression) {
        if (!isHttpClientCall(node)) return;

        const result = checkUrlArgument(node);
        if (result?.tainted) {
          context.report({
            node,
            messageId: 'ssrfVulnerability',
            data: {
              source: result.source,
            },
            suggest: [
              {
                messageId: 'useAllowlist',
                fix: () => null, // Complex fix requiring allowlist setup
              },
            ],
          });
        }
      },
    };
  },
});
