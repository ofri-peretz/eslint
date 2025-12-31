/**
 * ESLint Rule: prefer-modern-api
 * Suggests modern replacements for deprecated or outdated library imports
 *
 * Why This Matters:
 * - Keeps codebase up-to-date with modern best practices
 * - Avoids security vulnerabilities in outdated libraries
 * - Reduces bundle size with modern tree-shakeable alternatives
 * - Prevents tech debt from accumulating
 *
 * @see https://github.com/sindresorhus/meta/discussions/15
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'preferModernApi';

/**
 * Modern API recommendation
 */
interface ModernApiMapping {
  /** Deprecated/outdated package */
  deprecated: string;
  /** Modern replacement */
  modern: string;
  /** Reason for migration */
  reason: string;
  /** Migration difficulty: easy, medium, hard */
  difficulty?: 'easy' | 'medium' | 'hard';
  /** Link to migration guide */
  migrationGuide?: string;
}

/**
 * Configuration options for prefer-modern-api rule
 */
export interface PreferModernApiOptions {
  /** Custom mappings (in addition to built-in) */
  customMappings?: ModernApiMapping[];
  /** Disable built-in mappings */
  disableBuiltIn?: boolean;
}

type RuleOptions = [PreferModernApiOptions?];

// Built-in mappings for common outdated packages
const BUILT_IN_MAPPINGS: ModernApiMapping[] = [
  // Date/Time
  {
    deprecated: 'moment',
    modern: 'date-fns or dayjs',
    reason: 'Moment.js is in maintenance mode. date-fns is tree-shakeable.',
    difficulty: 'medium',
    migrationGuide: 'https://github.com/date-fns/date-fns/blob/HEAD/docs/moment.md',
  },
  {
    deprecated: 'moment-timezone',
    modern: 'date-fns-tz',
    reason: 'Maintenance mode. date-fns-tz is smaller and tree-shakeable.',
    difficulty: 'medium',
  },
  
  // HTTP Clients
  {
    deprecated: 'request',
    modern: 'node-fetch, axios, or undici',
    reason: 'request is deprecated since 2020. Use modern alternatives.',
    difficulty: 'easy',
  },
  {
    deprecated: 'request-promise',
    modern: 'axios or node-fetch',
    reason: 'Deprecated with the request package.',
    difficulty: 'easy',
  },
  
  // Utility Libraries (full imports)
  {
    deprecated: 'underscore',
    modern: 'lodash-es or native methods',
    reason: 'Underscore is outdated. Modern JS has most utilities built-in.',
    difficulty: 'medium',
  },
  
  // Testing
  {
    deprecated: 'mocha',
    modern: 'vitest or jest',
    reason: 'Vitest offers faster execution and better ESM support.',
    difficulty: 'hard',
  },
  {
    deprecated: 'chai',
    modern: 'vitest expect or jest',
    reason: 'Modern test runners have built-in assertions.',
    difficulty: 'medium',
  },
  
  // Build Tools
  {
    deprecated: 'gulp',
    modern: 'npm scripts or vite',
    reason: 'Modern bundlers handle most gulp tasks natively.',
    difficulty: 'hard',
  },
  {
    deprecated: 'grunt',
    modern: 'npm scripts or vite',
    reason: 'Grunt is largely obsolete. Use modern build tools.',
    difficulty: 'hard',
  },
  
  // CSS
  {
    deprecated: 'node-sass',
    modern: 'sass (dart-sass)',
    reason: 'node-sass is deprecated. dart-sass is the official implementation.',
    difficulty: 'easy',
  },
  
  // Crypto
  {
    deprecated: 'bcrypt-nodejs',
    modern: 'bcrypt or bcryptjs',
    reason: 'bcrypt-nodejs is unmaintained and has security issues.',
    difficulty: 'easy',
  },
  
  // UUID
  {
    deprecated: 'uuid/v4',
    modern: 'crypto.randomUUID() or uuid',
    reason: 'Node.js 16+ has built-in crypto.randomUUID().',
    difficulty: 'easy',
  },
  
  // State Management
  {
    deprecated: 'redux',
    modern: 'zustand, jotai, or redux-toolkit',
    reason: 'Modern state libraries have less boilerplate.',
    difficulty: 'hard',
  },
  
  // Validation
  {
    deprecated: 'joi',
    modern: 'zod or yup',
    reason: 'Zod has better TypeScript integration and smaller bundle.',
    difficulty: 'medium',
  },
  
  // Bundlers
  {
    deprecated: 'webpack',
    modern: 'vite, esbuild, or rspack',
    reason: 'Vite and esbuild offer 10-100x faster builds.',
    difficulty: 'hard',
  },
];

/**
 * Match package name against pattern
 */
function matchPackage(importPath: string, deprecated: string): boolean {
  const packageName = importPath.startsWith('@')
    ? importPath.split('/').slice(0, 2).join('/')
    : importPath.split('/')[0];
  
  return packageName === deprecated || importPath.startsWith(deprecated + '/');
}

export const preferModernApi = createRule<RuleOptions, MessageIds>({
  name: 'prefer-modern-api',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Suggest modern replacements for deprecated or outdated libraries',
    },
    messages: {
      preferModernApi: formatLLMMessage({
        icon: MessageIcons.DEPRECATION,
        issueName: 'Outdated Package',
        description:
          "'{{deprecated}}' is outdated. Consider migrating to {{modern}}. " +
          "Reason: {{reason}}",
        severity: 'LOW',
        fix:
          'Migration difficulty: {{difficulty}}\n' +
          '{{migrationGuide}}',
        documentationLink: '',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          customMappings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                deprecated: { type: 'string' },
                modern: { type: 'string' },
                reason: { type: 'string' },
                difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
                migrationGuide: { type: 'string' },
              },
              required: ['deprecated', 'modern', 'reason'],
            },
          },
          disableBuiltIn: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      customMappings: [],
      disableBuiltIn: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]: readonly [PreferModernApiOptions?],
  ) {
    const { customMappings = [], disableBuiltIn = false } = options;
    
    const allMappings = disableBuiltIn
      ? customMappings
      : [...BUILT_IN_MAPPINGS, ...customMappings];

    function checkImport(importPath: string, node: TSESTree.Node) {
      // Only check package imports
      if (importPath.startsWith('.') || importPath.startsWith('/')) return;

      for (const mapping of allMappings) {
        if (matchPackage(importPath, mapping.deprecated)) {
          context.report({
            node,
            messageId: 'preferModernApi',
            data: {
              deprecated: mapping.deprecated,
              modern: mapping.modern,
              reason: mapping.reason,
              difficulty: mapping.difficulty || 'unknown',
              migrationGuide: mapping.migrationGuide
                ? `See: ${mapping.migrationGuide}`
                : 'Check package documentation for migration guide.',
            },
          });
          break;
        }
      }
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;
        if (typeof importPath === 'string') {
          checkImport(importPath, node);
        }
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        if (node.source.type === AST_NODE_TYPES.Literal) {
          const importPath = node.source.value;
          if (typeof importPath === 'string') {
            checkImport(importPath, node);
          }
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === AST_NODE_TYPES.Literal
        ) {
          const importPath = node.arguments[0].value;
          if (typeof importPath === 'string') {
            checkImport(importPath, node);
          }
        }
      },
    };
  },
});
