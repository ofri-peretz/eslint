/**
 * ESLint Rule: no-anonymous-default-export
 * Forbid anonymous values as default exports (eslint-plugin-import inspired)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'anonymousDefaultExport' | 'suggestNamedExport' | 'arrowFunctionExport' | 'useNamedExport';

export interface Options {
  /** Allow anonymous arrow functions */
  allowArrowFunction?: boolean;
  /** Allow anonymous class expressions */
  allowClassExpression?: boolean;
  /** Allow anonymous function expressions */
  allowFunctionExpression?: boolean;
}

type RuleOptions = [Options?];

export const noAnonymousDefaultExport = createRule<RuleOptions, MessageIds>({
  name: 'no-anonymous-default-export',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Forbid anonymous values as default exports',
    },
    messages: {
      anonymousDefaultExport: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Anonymous Default Export',
        description: 'Default export should be named for better debugging',
        severity: 'MEDIUM',
        fix: 'Choose a meaningful name based on the function\'s purpose (e.g., handleSubmit, processData, validateInput)',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-anonymous-default-export.md',
      }),
      suggestNamedExport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Name Anonymous Function',
        description: 'Choose a descriptive name for this anonymous function',
        severity: 'MEDIUM',
        fix: 'Add a meaningful name like handleData, processInput, or validateForm',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-anonymous-default-export.md',
      }),
      useNamedExport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Use Named Export Pattern',
        description: 'Convert anonymous default export to named export',
        severity: 'MEDIUM',
        fix: 'Use named export: export function componentName() {}',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-anonymous-default-export.md',
      }),
      arrowFunctionExport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Arrow Function Export',
        description: 'Arrow function should be named for better debugging',
        severity: 'MEDIUM',
        fix: 'Choose a meaningful name based on the function\'s purpose (e.g., handleSubmit, processData, validateInput)',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-anonymous-default-export.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowArrowFunction: {
            type: 'boolean',
            default: false,
            description: 'Allow anonymous arrow function default exports.',
          },
          allowClassExpression: {
            type: 'boolean',
            default: false,
            description: 'Allow anonymous class expression default exports.',
          },
          allowFunctionExpression: {
            type: 'boolean',
            default: false,
            description: 'Allow anonymous function expression default exports.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    allowArrowFunction: false,
    allowClassExpression: false,
    allowFunctionExpression: false
  }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      allowArrowFunction = false,
      allowClassExpression = false,
      allowFunctionExpression = false,
    } = options || {};


    function isAnonymous(node: TSESTree.ExportDefaultDeclaration): boolean {
      const declaration = node.declaration;

      switch (declaration.type) {
        case 'ArrowFunctionExpression':
          return !allowArrowFunction;

        case 'ClassExpression':
          return !allowClassExpression;

        case 'FunctionExpression':
          return !allowFunctionExpression;

        case 'FunctionDeclaration':
          // Function declarations in default exports are anonymous if they have no name
          // (e.g., export default function() {}), and should be treated like function expressions
          return declaration.id ? false : !allowFunctionExpression;

        case 'ClassDeclaration':
          // Class declarations in default exports are anonymous if they have no name
          // (e.g., export default class {}), and should be treated like class expressions
          return declaration.id ? false : !allowClassExpression;

        case 'CallExpression':
          // Allow calls like React.forwardRef(() => ...)
          // Allow calls like withRouter(Component)
          return false;

        case 'Identifier':
        case 'Literal':
        case 'ObjectExpression':
        case 'ArrayExpression':
          // These are not anonymous - they're named references or literals
          return false;

        default:
          return true;
      }
    }

    function getSuggestionText(node: TSESTree.ExportDefaultDeclaration): string {
      const declaration = node.declaration;

      switch (declaration.type) {
        case 'ArrowFunctionExpression':
          return 'Convert to named arrow function: export default function componentName() {}';

        case 'FunctionExpression':
          return 'Add name to function: export default function componentName() {}';

        case 'ClassExpression':
          return 'Add name to class: export default class ComponentName {}';

        default:
          return 'Use named export instead';
      }
    }


    return {
      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
        if (isAnonymous(node)) {
          context.report({
            node,
            messageId: 'anonymousDefaultExport',
            data: {
              exportType: node.declaration.type,
              suggestion: getSuggestionText(node),
              benefit: 'Named exports improve debugging, tree-shaking, and code navigation',
            },
          });
        }
      },
    };
  },
});
