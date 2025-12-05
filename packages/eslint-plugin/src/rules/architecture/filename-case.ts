/**
 * ESLint Rule: filename-case
 * Enforce filename case conventions
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { getBasename } from '@interlace/eslint-devkit';

type MessageIds = 'filenameCase';

export type CaseType = 'camelCase' | 'kebabCase' | 'pascalCase' | 'snakeCase';

/**
 * Default uppercase filenames that are conventionally valid across all case conventions
 */
const DEFAULT_ALLOWED_UPPERCASE_FILES = [
  'README',
  'LICENSE',
  'CHANGELOG',
  'CONTRIBUTING',
  'AUTHORS',
  'COPYING',
  'SECURITY',
  'NOTICE',
  'PATENTS',
  'VERSION',
];

export interface Options {
  /** Case convention to enforce */
  case?: CaseType;
  /** List of patterns to ignore completely */
  ignore?: (string | RegExp)[];
  /** List of uppercase filenames to allow (without extension). Set to empty array to disable. */
  allowedUppercaseFiles?: string[];
  /** List of filenames allowed to use kebab-case regardless of the global case setting */
  allowedKebabCase?: string[];
  /** List of filenames allowed to use snake_case regardless of the global case setting */
  allowedSnakeCase?: string[];
  /** List of filenames allowed to use camelCase regardless of the global case setting */
  allowedCamelCase?: string[];
  /** List of filenames allowed to use PascalCase regardless of the global case setting */
  allowedPascalCase?: string[];
}

type RuleOptions = [Options?];

export const filenameCase = createRule<RuleOptions, MessageIds>({
  name: 'filename-case',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce filename case conventions for consistency',
    },
    hasSuggestions: true,
    messages: {
      filenameCase: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Filename Case Convention',
        description: 'Filename "{{current}}" violates {{case}} naming convention',
        severity: 'MEDIUM',
        fix: 'Rename file from "{{current}}" to "{{suggested}}" following {{case}} convention',
        documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/filename-case.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          case: {
            type: 'string',
            enum: ['camelCase', 'kebabCase', 'pascalCase', 'snakeCase'],
            default: 'kebabCase',
          },
          ignore: {
            type: 'array',
            items: {
              anyOf: [
                { type: 'string' },
                { type: 'object' },
              ],
            },
            default: [],
          },
          allowedUppercaseFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of uppercase filenames to allow (without extension). Defaults to common files like README, LICENSE, etc.',
          },
          allowedKebabCase: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of filenames allowed to use kebab-case regardless of the global case setting.',
            default: [],
          },
          allowedSnakeCase: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of filenames allowed to use snake_case regardless of the global case setting.',
            default: [],
          },
          allowedCamelCase: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of filenames allowed to use camelCase regardless of the global case setting.',
            default: [],
          },
          allowedPascalCase: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of filenames allowed to use PascalCase regardless of the global case setting.',
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    case: 'kebabCase',
    ignore: [],
    allowedUppercaseFiles: DEFAULT_ALLOWED_UPPERCASE_FILES,
    allowedKebabCase: [],
    allowedSnakeCase: [],
    allowedCamelCase: [],
    allowedPascalCase: [],
  }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      case: caseType = 'kebabCase',
      ignore = [],
      allowedUppercaseFiles = DEFAULT_ALLOWED_UPPERCASE_FILES,
      allowedKebabCase = [],
      allowedSnakeCase = [],
      allowedCamelCase = [],
      allowedPascalCase = [],
    } = options || {};

    // Convert to different case formats
    function toCamelCase(str: string): string {
      return str.replace(/[-_](.)/g, (_, letter) => letter.toUpperCase());
    }

    function toKebabCase(str: string): string {
      return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    }

    function toPascalCase(str: string): string {
      const camel = toCamelCase(str);
      return camel.charAt(0).toUpperCase() + camel.slice(1);
    }

    function toSnakeCase(str: string): string {
      return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    }

    // Check if filename matches the expected case pattern
    function isCamelCase(str: string): boolean {
      // camelCase: starts with lowercase, no separators, can have uppercase after first char
      return /^[a-z][a-zA-Z0-9]*$/.test(str);
    }

    function isKebabCase(str: string): boolean {
      // kebab-case: all lowercase with hyphens as separators
      return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(str);
    }

    function isPascalCase(str: string): boolean {
      // PascalCase: starts with uppercase, no separators
      return /^[A-Z][a-zA-Z0-9]*$/.test(str);
    }

    function isSnakeCase(str: string): boolean {
      // snake_case: all lowercase with underscores as separators
      return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(str);
    }

    function matchesCase(str: string, expectedCase: CaseType): boolean {
      switch (expectedCase) {
        case 'camelCase':
          return isCamelCase(str);
        case 'kebabCase':
          return isKebabCase(str);
        case 'pascalCase':
          return isPascalCase(str);
        case 'snakeCase':
          return isSnakeCase(str);
        default:
          return true;
      }
    }

    // Generate suggested filename
    function getSuggestedName(basename: string, nameWithoutExt: string, targetCase: CaseType): string {
      let transformed: string;
      switch (targetCase) {
        case 'camelCase':
          transformed = toCamelCase(nameWithoutExt);
          break;
        case 'kebabCase':
          transformed = toKebabCase(nameWithoutExt);
          break;
        case 'pascalCase':
          transformed = toPascalCase(nameWithoutExt);
          break;
        case 'snakeCase':
          transformed = toSnakeCase(nameWithoutExt);
          break;
        default:
          transformed = nameWithoutExt;
      }

      // Add back the extension
      const ext = basename.slice(nameWithoutExt.length);
      return transformed + ext;
    }

    return {
      Program(node: TSESTree.Program) {
        // Get filename from context
        const filename = context.getFilename();
        if (!filename) {
          return;
        }

        // Get just the filename part (without directory)
        const basename = getBasename(filename);

        // Remove all extensions for checking (handles .spec.ts, .test.tsx, etc.)
        const nameWithoutExt = basename.replace(/(\.(spec|test|stories|story|e2e|d))*\.[^.]+$/, '');

        // Skip if no name part (e.g., just extension or dotfile)
        if (!nameWithoutExt) {
          return;
        }

        // Check if filename should be ignored
        for (const ignorePattern of ignore) {
          if (typeof ignorePattern === 'string') {
            if (basename === ignorePattern) {
              return;
            }
          } else if (ignorePattern instanceof RegExp) {
            if (ignorePattern.test(basename)) {
              return;
            }
          }
        }

        // Skip allowed uppercase files (README, LICENSE, etc.) as they are conventionally valid
        if (allowedUppercaseFiles.includes(nameWithoutExt)) {
          return;
        }

        // Skip dotfiles (.eslintrc, .gitignore, etc.)
        if (basename.startsWith('.')) {
          return;
        }

        // Check if filename is allowed via case-specific overrides
        // These allow specific files to use a different case than the global setting
        if (allowedKebabCase.includes(nameWithoutExt) && matchesCase(nameWithoutExt, 'kebabCase')) {
          return;
        }
        if (allowedSnakeCase.includes(nameWithoutExt) && matchesCase(nameWithoutExt, 'snakeCase')) {
          return;
        }
        if (allowedCamelCase.includes(nameWithoutExt) && matchesCase(nameWithoutExt, 'camelCase')) {
          return;
        }
        if (allowedPascalCase.includes(nameWithoutExt) && matchesCase(nameWithoutExt, 'pascalCase')) {
          return;
        }

        // Check if filename matches the expected case
        if (!matchesCase(nameWithoutExt, caseType)) {
          const suggestedName = getSuggestedName(basename, nameWithoutExt, caseType);

          context.report({
            node, // Report on the Program node
            messageId: 'filenameCase',
            data: {
              case: caseType,
              current: basename,
              suggested: suggestedName,
            },
            suggest: [
              {
                messageId: 'filenameCase',
                data: {
                  suggestedName,
                },
                fix() {
                  // This is a file rename operation that can't be auto-fixed
                  // Just provide the suggestion
                  return null;
                },
              },
            ],
          });
        }
      },
    };
  },
});
