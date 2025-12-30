/**
 * ESLint Rule: require-throttler
 * Requires @Throttle or ThrottlerGuard for rate limiting
 * CWE-770: Allocation of Resources Without Limits or Throttling
 *
 * @see https://cwe.mitre.org/data/definitions/770.html
 * @see https://docs.nestjs.com/security/rate-limiting
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'missingThrottler' | 'addThrottler';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Skip checking specific routes. Default: [] */
  skipRoutes?: string[];
  /** Skip rule if ThrottlerModule is configured globally in AppModule. Default: false */
  assumeGlobalThrottler?: boolean;
}

type RuleOptions = [Options?];

// HTTP method decorators that indicate route handlers
const HTTP_METHOD_DECORATORS = [
  'Get',
  'Post',
  'Put',
  'Patch',
  'Delete',
  'Options',
  'Head',
  'All',
];

// Throttle-related decorators
const THROTTLE_DECORATORS = ['Throttle', 'SkipThrottle'];

export const requireThrottler = createRule<RuleOptions, MessageIds>({
  name: 'require-throttler',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Requires ThrottlerGuard or @Throttle decorator for rate limiting',
    },
    hasSuggestions: true,
    messages: {
      missingThrottler: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Rate Limiting',
        cwe: 'CWE-770',
        cvss: 7.5,
        description: 'Controller {{name}} lacks rate limiting protection (Throttler)',
        severity: 'HIGH',
        fix: 'Add @UseGuards(ThrottlerGuard) or configure global ThrottlerModule',
        documentationLink: 'https://docs.nestjs.com/security/rate-limiting',
      }),
      addThrottler: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Rate Limiting',
        description: 'Configure ThrottlerModule to protect against DoS/brute-force attacks',
        severity: 'LOW',
        fix: 'npm i @nestjs/throttler && ThrottlerModule.forRoot({ ttl: 60, limit: 10 })',
        documentationLink: 'https://docs.nestjs.com/security/rate-limiting',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          skipRoutes: { type: 'array', items: { type: 'string' }, default: [] },
          assumeGlobalThrottler: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, skipRoutes: [], assumeGlobalThrottler: false }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowInTests = true, assumeGlobalThrottler = false } = options as Options;

    // Skip entirely if global ThrottlerModule is assumed (configured in AppModule)
    if (assumeGlobalThrottler) {
      return {};
    }

    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    // Track class-level throttler and controller state
    let isController = false;
    let hasClassLevelThrottler = false;
    let hasThrottlerGuard = false;

    /**
     * Check if decorators include @UseGuards with ThrottlerGuard
     */
    function hasThrottlerGuardDecorator(decorators: TSESTree.Decorator[] | undefined): boolean {
      if (!decorators) return false;
      return decorators.some((dec) => {
        if (dec.expression.type === AST_NODE_TYPES.CallExpression) {
          const callee = dec.expression.callee;
          if (callee.type === AST_NODE_TYPES.Identifier && callee.name === 'UseGuards') {
            return dec.expression.arguments.some(
              (arg: TSESTree.CallExpressionArgument) => arg.type === AST_NODE_TYPES.Identifier && arg.name === 'ThrottlerGuard'
            );
          }
        }
        return false;
      });
    }

    /**
     * Check if decorators include @Throttle or @SkipThrottle
     */
    function hasThrottleDecorator(decorators: TSESTree.Decorator[] | undefined): boolean {
      if (!decorators) return false;
      return decorators.some((dec) => {
        const name =
          dec.expression.type === AST_NODE_TYPES.Identifier
            ? dec.expression.name
            : dec.expression.type === AST_NODE_TYPES.CallExpression &&
              dec.expression.callee.type === AST_NODE_TYPES.Identifier
            ? dec.expression.callee.name
            : '';
        return THROTTLE_DECORATORS.includes(name);
      });
    }

    /**
     * Check if class has @Controller decorator
     */
    function hasControllerDecorator(decorators: TSESTree.Decorator[] | undefined): boolean {
      if (!decorators) return false;
      return decorators.some((dec) => {
        const name =
          dec.expression.type === AST_NODE_TYPES.Identifier
            ? dec.expression.name
            : dec.expression.type === AST_NODE_TYPES.CallExpression &&
              dec.expression.callee.type === AST_NODE_TYPES.Identifier
            ? dec.expression.callee.name
            : '';
        return name === 'Controller';
      });
    }

    /**
     * Check if method has HTTP method decorator
     */
    function isRouteHandler(decorators: TSESTree.Decorator[] | undefined): boolean {
      if (!decorators) return false;
      return decorators.some((dec) => {
        const name =
          dec.expression.type === AST_NODE_TYPES.Identifier
            ? dec.expression.name
            : dec.expression.type === AST_NODE_TYPES.CallExpression &&
              dec.expression.callee.type === AST_NODE_TYPES.Identifier
            ? dec.expression.callee.name
            : '';
        return HTTP_METHOD_DECORATORS.includes(name);
      });
    }

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        isController = hasControllerDecorator(node.decorators);
        hasClassLevelThrottler = hasThrottleDecorator(node.decorators);
        hasThrottlerGuard = hasThrottlerGuardDecorator(node.decorators);
      },

      MethodDefinition(node: TSESTree.MethodDefinition) {
        if (!isController) return;
        if (!isRouteHandler(node.decorators)) return;

        // Skip if class or method has throttler
        if (
          hasClassLevelThrottler ||
          hasThrottlerGuard ||
          hasThrottleDecorator(node.decorators) ||
          hasThrottlerGuardDecorator(node.decorators)
        ) {
          return;
        }

        // Skip constructor
        if (node.key.type === AST_NODE_TYPES.Identifier && node.key.name === 'constructor') {
          return;
        }

        const methodName =
          node.key.type === AST_NODE_TYPES.Identifier ? node.key.name : '<anonymous>';

        context.report({
          node,
          messageId: 'missingThrottler',
          data: { name: methodName },
          suggest: [{ messageId: 'addThrottler', fix: () => null }],
        });
      },
    };
  },
});
