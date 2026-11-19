/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-anonymous-default-export
 * Forbid anonymous values as default exports (eslint-plugin-import inspired)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds =
  | 'anonymousDefaultExport'
  | 'suggestNamedExport'
  | 'arrowFunctionExport'
  | 'useNamedExport';

export interface Options {
  /** Allow anonymous arrow functions */
  allowArrowFunction?: boolean;
  /** Allow anonymous class expressions */
  allowClassExpression?: boolean;
  /** Allow anonymous function expressions */
  allowFunctionExpression?: boolean;
  /** eslint-plugin-import: allow `export default []`. */
  allowArray?: boolean;
  /** eslint-plugin-import's name for `allowClassExpression`. */
  allowAnonymousClass?: boolean;
  /** eslint-plugin-import's name for `allowFunctionExpression`. */
  allowAnonymousFunction?: boolean;
  /** eslint-plugin-import: allow `export default foo()` (its default). */
  allowCallExpression?: boolean;
  /** eslint-plugin-import: allow `export default new Foo()`. */
  allowNew?: boolean;
  /** eslint-plugin-import: allow a literal or template literal. */
  allowLiteral?: boolean;
  /** eslint-plugin-import: allow `export default {}`. */
  allowObject?: boolean;
}

type RuleOptions = [Options?];

/** The value kinds only eslint-plugin-import reports, by the option for each. */
type ValueKindOption =
  | 'allowArray'
  | 'allowCallExpression'
  | 'allowNew'
  | 'allowLiteral'
  | 'allowObject';
const VALUE_KIND_OPTION: Record<string, ValueKindOption> = {
  ArrayExpression: 'allowArray',
  CallExpression: 'allowCallExpression',
  NewExpression: 'allowNew',
  Literal: 'allowLiteral',
  TemplateLiteral: 'allowLiteral',
  ObjectExpression: 'allowObject',
};

/**
 * Options only eslint-plugin-import has. One of them means the config is
 * written its way, and is read its way: every value kind it reports by
 * default (arrays, literals, objects, `new`) is reported unless allowed.
 * Without one, this rule's own reading: only functions and classes.
 */
const UPSTREAM_ONLY = new Set([
  'allowArray',
  'allowAnonymousClass',
  'allowAnonymousFunction',
  'allowCallExpression',
  'allowNew',
  'allowLiteral',
  'allowObject',
]);
const VALUE_KINDS_UPSTREAM: Record<ValueKindOption, boolean> = {
  allowArray: false,
  allowCallExpression: true,
  allowNew: false,
  allowLiteral: false,
  allowObject: false,
};
const VALUE_KINDS_OWN: Record<ValueKindOption, boolean> = {
  allowArray: true,
  allowCallExpression: true,
  allowNew: true,
  allowLiteral: true,
  allowObject: true,
};

const UPSTREAM_SWITCH = (description: string) => ({
  type: 'boolean' as const,
  description: `eslint-plugin-import: ${description}`,
});

export const noAnonymousDefaultExport = createRule<RuleOptions, MessageIds>({
  name: 'no-anonymous-default-export',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/no-anonymous-default-export',
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-anonymous-default-export.md',
      description: 'Forbid anonymous values as default exports',
    },
    messages: {
      anonymousDefaultExport: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Anonymous Default Export',
        description: 'Default export should be named for better debugging',
        severity: 'MEDIUM',
        fix: "Choose a meaningful name based on the function's purpose (e.g., handleSubmit, processData, validateInput)",
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-anonymous-default-export.md',
      }),
      suggestNamedExport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Name Anonymous Function',
        description: 'Choose a descriptive name for this anonymous function',
        severity: 'MEDIUM',
        fix: 'Add a meaningful name like handleData, processInput, or validateForm',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-anonymous-default-export.md',
      }),
      useNamedExport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Use Named Export Pattern',
        description: 'Convert anonymous default export to named export',
        severity: 'MEDIUM',
        fix: 'Use named export: export function componentName() {}',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-anonymous-default-export.md',
      }),
      arrowFunctionExport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Arrow Function Export',
        description: 'Arrow function should be named for better debugging',
        severity: 'MEDIUM',
        fix: "Choose a meaningful name based on the function's purpose (e.g., handleSubmit, processData, validateInput)",
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-anonymous-default-export.md',
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
          allowArray: UPSTREAM_SWITCH('allow an array.'),
          allowAnonymousClass: UPSTREAM_SWITCH(
            'allow an anonymous class (`allowClassExpression`).',
          ),
          allowAnonymousFunction: UPSTREAM_SWITCH(
            'allow an anonymous function (`allowFunctionExpression`).',
          ),
          allowCallExpression: UPSTREAM_SWITCH(
            'allow a function call (default `true`).',
          ),
          allowNew: UPSTREAM_SWITCH('allow a `new` expression.'),
          allowLiteral: UPSTREAM_SWITCH('allow a literal or template literal.'),
          allowObject: UPSTREAM_SWITCH('allow an object expression.'),
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowArrowFunction: false,
      allowClassExpression: false,
      allowFunctionExpression: false,
    },
  ],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowArrowFunction: boolean;
    let allowClassExpression: boolean;
    let allowFunctionExpression: boolean;
    let valueKinds: Record<ValueKindOption, boolean>;

    /**
     * The exported function or class, through TS wrappers that do not change
     * the value (`(() => {}) as Handler`, `satisfies`, `!`, `<T>x`).
     */
    // oxlint-disable-next-line consistent-function-scoping
    function exportedValue(
      node: TSESTree.ExportDefaultDeclaration,
    ): TSESTree.Node {
      let value: TSESTree.Node = node.declaration;
      while (
        value.type === 'TSAsExpression' ||
        value.type === 'TSSatisfiesExpression' ||
        value.type === 'TSNonNullExpression' ||
        value.type === 'TSTypeAssertion'
      ) {
        value = value.expression;
      }
      return value;
    }

    /**
     * A default export is anonymous when it is a function or a class with no
     * name. Everything else (a reference, a call, a literal, an object, an
     * interface) is not a function or class this rule names.
     */
    function isAnonymous(node: TSESTree.ExportDefaultDeclaration): boolean {
      const value = exportedValue(node);
      switch (value.type) {
        case 'ArrowFunctionExpression':
          return !allowArrowFunction;
        case 'FunctionExpression':
        case 'FunctionDeclaration':
          return !value.id && !allowFunctionExpression;
        case 'ClassExpression':
        case 'ClassDeclaration':
          return !value.id && !allowClassExpression;
        default:
          // Arrays, literals, objects, `new` and calls: reported only under
          // eslint-plugin-import's reading, and only when not allowed.
          return valueKinds[VALUE_KIND_OPTION[value.type]] === false;
      }
    }

    // oxlint-disable-next-line consistent-function-scoping
    function getSuggestionText(
      node: TSESTree.ExportDefaultDeclaration,
    ): string {
      const declaration = exportedValue(node);

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
      before() {
        const [options] = context.options;
        const o = options || {};
        const upstream = Object.keys(o).some((key) => UPSTREAM_ONLY.has(key));
        const merged = {
          ...(upstream ? VALUE_KINDS_UPSTREAM : VALUE_KINDS_OWN),
          allowArrowFunction: false,
          allowClassExpression: false,
          allowFunctionExpression: false,
          ...o,
        };
        ({ allowArrowFunction } = merged);
        allowClassExpression = Boolean(
          merged.allowAnonymousClass || merged.allowClassExpression,
        );
        allowFunctionExpression = Boolean(
          merged.allowAnonymousFunction || merged.allowFunctionExpression,
        );
        valueKinds = merged;
      },
      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
        if (isAnonymous(node)) {
          context.report({
            node,
            messageId: 'anonymousDefaultExport',
            data: {
              exportType: node.declaration.type,
              suggestion: getSuggestionText(node),
              benefit:
                'Named exports improve debugging, tree-shaking, and code navigation',
            },
          });
        }
      },
    };
  },
});
