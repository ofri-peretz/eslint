/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-commonjs
 * Prevents CommonJS require/module.exports (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule, propertyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isLocallyBound } from '../utils/bindings';
import { matchesAnyFilePattern } from '../utils/file-patterns';

type MessageIds = 'commonjsRequire' | 'commonjsExport' | 'commonjsModule';

export interface Options {
  /** Allow CommonJS in certain contexts */
  allowRequire?: boolean;
  /** Allow module.exports */
  allowModuleExports?: boolean;
  /** Allow exports.* */
  allowExports?: boolean;
  /** Allow CommonJS in specific files */
  allowInFiles?: string[];
  /** Suggest ES6 alternatives */
  suggestES6?: boolean;
  /**
   * eslint-plugin-import: allow `module.exports = <value>` when the value is
   * not an object literal (a function, a class, a primitive).
   */
  allowPrimitiveModules?: boolean;
  /**
   * eslint-plugin-import: allow a `require()` inside an `if`, a `try`, a
   * `&&`/`||`/`??` or a `?:`. Its default there is `true`, and so here for a
   * config written its way; otherwise this rule's own default, `false`.
   */
  allowConditionalRequire?: boolean;
}

/** eslint-plugin-import's older form: `['allow-primitive-modules']`. */
type RuleOptions = [(Options | 'allow-primitive-modules')?];

/** One JSON schema node, as ESLint's rule metadata types it. */
type JSONSchema4 = Exclude<
  NonNullable<TSESLint.RuleMetaData<string, unknown[]>['schema']>,
  readonly unknown[]
>;

const OBJECT_OPTION: JSONSchema4 = {
  type: 'object',
  properties: {
    allowRequire: {
      type: 'boolean',
      description: 'Allow require() calls (default false).',
    },
    allowModuleExports: {
      type: 'boolean',
      description: 'Allow module.exports (default false).',
    },
    allowExports: {
      type: 'boolean',
      description: 'Allow exports.* patterns (default false).',
    },
    allowInFiles: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'Allow CommonJS in specific files.',
    },
    suggestES6: {
      type: 'boolean',
      description: 'Suggest ES6 alternatives (default true).',
    },
    allowPrimitiveModules: {
      type: 'boolean',
      description:
        'eslint-plugin-import: allow `module.exports = value` when the value is not an object literal.',
    },
    allowConditionalRequire: {
      type: 'boolean',
      description:
        'eslint-plugin-import: allow require() inside an if, try, logical or conditional expression.',
    },
  },
  additionalProperties: false,
};

/** A `require()` under an `if`, `try`, logical or conditional expression. */
function isConditional(node: TSESTree.Node): boolean {
  for (
    let current: TSESTree.Node | undefined = node.parent;
    current;
    current = current.parent
  ) {
    if (
      current.type === 'IfStatement' ||
      current.type === 'TryStatement' ||
      current.type === 'LogicalExpression' ||
      current.type === 'ConditionalExpression'
    ) {
      return true;
    }
  }
  return false;
}

export const noCommonjs = createRule<RuleOptions, MessageIds>({
  name: 'no-commonjs',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/no-commonjs',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-commonjs.md',
      description: 'Prevents CommonJS require/module.exports',
    },
    hasSuggestions: true,
    messages: {
      commonjsRequire: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'CommonJS Require',
        description: 'CommonJS require() call detected',
        severity: 'MEDIUM',
        fix: 'Use ES6 import syntax instead of require()',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-commonjs.md',
      }),
      commonjsExport: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'CommonJS Export',
        description: 'CommonJS module.exports detected',
        severity: 'MEDIUM',
        fix: 'Use ES6 export default or export {} syntax',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-commonjs.md',
      }),
      commonjsModule: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'CommonJS Module',
        description: 'CommonJS exports.* pattern detected',
        severity: 'MEDIUM',
        fix: 'Use ES6 named export syntax',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-commonjs.md',
      }),
    },
    /*
     * This rule's object, and eslint-plugin-import's older string form,
     * `['allow-primitive-modules']`, which means `{ allowPrimitiveModules:
     * true }` there and here.
     */
    schema: {
      anyOf: [
        {
          type: 'array',
          items: [{ type: 'string', enum: ['allow-primitive-modules'] }],
          additionalItems: false,
        },
        { type: 'array', items: [OBJECT_OPTION], additionalItems: false },
      ],
    },
  },
  defaultOptions: [
    {
      allowRequire: false,
      allowModuleExports: false,
      allowExports: false,
      allowInFiles: [],
      suggestES6: true,
    },
  ],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowRequire: boolean;
    let allowModuleExports: boolean;
    let allowExports: boolean;
    let allowInFiles: string[];
    let suggestES6: boolean;
    let allowPrimitiveModules: boolean;
    let allowConditionalRequire: boolean;
    let filename: string;

    function shouldAllow(): boolean {
      if (!filename) {
        return false;
      }
      // A `.cjs` / `.cts` file, or one the config parses as CommonJS, is
      // CommonJS on purpose: it cannot use ES module syntax.
      if (
        /\.c[jt]s$/.test(filename) ||
        context.languageOptions?.sourceType === 'commonjs'
      ) {
        return true;
      }
      return matchesAnyFilePattern(filename, allowInFiles);
    }

    /** `name` here is the CommonJS global, not a binding of this file. */
    const isGlobal = (node: TSESTree.Node, name: string) =>
      !isLocallyBound(context.sourceCode, node, name);

    function generateES6Suggestion(node: TSESTree.Node): string {
      // Try to generate ES6 equivalent based on the CommonJS pattern

      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require'
      ) {
        // require('module')
        const arg = node.arguments[0];
        if (arg?.type === 'Literal' && typeof arg.value === 'string') {
          return `// Convert to: import * as moduleName from '${arg.value}';`;
        }
      }

      if (node.type === 'AssignmentExpression') {
        const left = node.left;
        const right = node.right;

        // module.exports = ...
        if (
          left.type === 'MemberExpression' &&
          left.object.type === 'Identifier' &&
          left.object.name === 'module' &&
          propertyName(left) === 'exports'
        ) {
          if (right.type === 'Identifier') {
            return `// Convert to: export default ${right.name};`;
          } else {
            return `// Convert to: export default ${context.sourceCode.getText(right)};`;
          }
        }

        // exports.something = ...
        if (
          left.type === 'MemberExpression' &&
          left.object.type === 'Identifier' &&
          left.object.name === 'exports' &&
          left.property.type === 'Identifier'
        ) {
          const propertyName = left.property.name;
          if (right.type === 'Identifier') {
            return `// Convert to: export const ${propertyName} = ${right.name};`;
          } else {
            return `// Convert to: export const ${propertyName} = ${context.sourceCode.getText(right)};`;
          }
        }
      }

      return '// Convert to ES6 import/export syntax';
    }

    return {
      before() {
        const [first] = context.options;
        const options: Options =
          typeof first === 'string'
            ? { allowPrimitiveModules: true }
            : first || {};
        // Written eslint-plugin-import's way: its string form, or a key only
        // it has. Then its default for conditional requires applies.
        const upstream =
          typeof first === 'string' ||
          'allowPrimitiveModules' in options ||
          'allowConditionalRequire' in options;
        ({
          allowRequire = false,
          allowModuleExports = false,
          allowExports = false,
          allowInFiles = [],
          suggestES6 = true,
          allowPrimitiveModules = false,
          allowConditionalRequire = upstream,
        } = options);

        filename = context.filename;
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (
          shouldAllow() ||
          allowRequire ||
          (allowConditionalRequire && isConditional(node))
        ) {
          return;
        }

        // Check for require() calls
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          isGlobal(node, 'require')
        ) {
          context.report({
            node: node.callee,
            messageId: 'commonjsRequire',
            data: {
              functionName: 'require',
              currentFile: filename,
              suggestion: 'Use import statement at the top of the file',
            },
            suggest: suggestES6
              ? [
                  {
                    messageId: 'commonjsRequire',
                    fix(fixer: TSESLint.RuleFixer) {
                      const suggestion = generateES6Suggestion(node);
                      return fixer.insertTextBefore(node, suggestion + '\n');
                    },
                  },
                ]
              : undefined,
          });
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (shouldAllow()) {
          return;
        }

        const left = node.left;

        // Check for module.exports = ...
        if (
          left.type === 'MemberExpression' &&
          left.object.type === 'Identifier' &&
          left.object.name === 'module' &&
          propertyName(left) === 'exports' &&
          !allowModuleExports &&
          !(allowPrimitiveModules && node.right.type !== 'ObjectExpression') &&
          isGlobal(left, 'module')
        ) {
          context.report({
            node: left,
            messageId: 'commonjsExport',
            data: {
              pattern: 'module.exports',
              currentFile: filename,
              suggestion: 'Use export default or export {} syntax',
            },
            suggest: suggestES6
              ? [
                  {
                    messageId: 'commonjsExport',
                    fix(fixer: TSESLint.RuleFixer) {
                      const suggestion = generateES6Suggestion(node);
                      return fixer.insertTextBefore(node, suggestion + '\n');
                    },
                  },
                ]
              : undefined,
          });
        }

        // Check for module.exports.property = ... (nested)
        else if (
          left.type === 'MemberExpression' &&
          left.object.type === 'MemberExpression' &&
          left.object.object.type === 'Identifier' &&
          left.object.object.name === 'module' &&
          propertyName(left.object) === 'exports' &&
          !allowModuleExports &&
          isGlobal(left, 'module')
        ) {
          context.report({
            node: left,
            messageId: 'commonjsModule',
            data: {
              pattern: 'module.exports.*',
              currentFile: filename,
              suggestion: 'Use named export syntax',
            },
            suggest: suggestES6
              ? [
                  {
                    messageId: 'commonjsModule',
                    fix(fixer: TSESLint.RuleFixer) {
                      return fixer.insertTextBefore(
                        node,
                        '// Convert to: export const propertyName = value;\n',
                      );
                    },
                  },
                ]
              : undefined,
          });
        }

        // Check for exports.* = ...
        else if (
          left.type === 'MemberExpression' &&
          left.object.type === 'Identifier' &&
          left.object.name === 'exports' &&
          !allowExports &&
          isGlobal(left, 'exports')
        ) {
          context.report({
            node: left,
            messageId: 'commonjsModule',
            data: {
              pattern: 'exports.*',
              currentFile: filename,
              suggestion: 'Use named export syntax',
            },
            suggest: suggestES6
              ? [
                  {
                    messageId: 'commonjsModule',
                    fix(fixer: TSESLint.RuleFixer) {
                      const suggestion = generateES6Suggestion(node);
                      return fixer.insertTextBefore(node, suggestion + '\n');
                    },
                  },
                ]
              : undefined,
          });
        }
      },

      // Check for TypeScript import = require() syntax
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (shouldAllow() || allowRequire) {
          return;
        }

        // Check if it's import x = require('module')
        if (node.moduleReference.type === 'TSExternalModuleReference') {
          // A callable CommonJS export (`module.exports = fn`) used as `x()`,
          // `new x()` or x`…` cannot be reached through a namespace import.
          const usedAsCallee = (
            context.sourceCode.getDeclaredVariables(node)[0]?.references ?? []
          ).some((ref) => {
            const parent = ref.identifier.parent;
            return (
              ((parent.type === 'CallExpression' ||
                parent.type === 'NewExpression') &&
                parent.callee === ref.identifier) ||
              (parent.type === 'TaggedTemplateExpression' &&
                parent.tag === ref.identifier)
            );
          });
          context.report({
            node,
            messageId: 'commonjsRequire',
            data: {
              functionName: 'require',
              currentFile: filename,
              suggestion: 'Use ES6 import statement',
            },
            // `export import x = …` has no one-statement ES6 form that also
            // binds `x` locally, so it gets no suggestion.
            suggest:
              suggestES6 &&
              !usedAsCallee &&
              node.parent.type !== 'ExportNamedDeclaration'
                ? [
                    {
                      messageId: 'commonjsRequire',
                      fix(fixer: TSESLint.RuleFixer) {
                        const modulePath =
                          node.moduleReference.type ===
                            'TSExternalModuleReference' &&
                          node.moduleReference.expression.type === 'Literal'
                            ? node.moduleReference.expression.value
                            : 'unknown';
                        // `import x = require()` binds the whole module: a
                        // namespace import, never a default import.
                        const typeOnly =
                          node.importKind === 'type' ? 'type ' : '';
                        return fixer.replaceText(
                          node,
                          `import ${typeOnly}* as ${node.id.name} from '${modulePath}';`,
                        );
                      },
                    },
                  ]
                : undefined,
          });
        }
      },

      // `__dirname` and `__filename` are deliberately NOT reported. This rule
      // detects the CommonJS module SYSTEM (`require`, `module.exports`,
      // `exports.x`), and eslint-plugin-import's does exactly that: it never looks
      // at the two path globals. Reporting them was 102 false positives on
      // lynx-stack against that plugin, and a drop-in that is louder than the
      // incumbent fails the adoption it exists for (PRINCIPLES.md). Whether a file
      // may use them is `no-restricted-globals`'s question, not this rule's.
    };
  },
});
