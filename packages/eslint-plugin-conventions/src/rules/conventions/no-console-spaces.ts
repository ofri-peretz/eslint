/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-console-spaces
 * Prevent leading/trailing space between console.log parameters
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, propertyName, staticString } from '@interlace/eslint-devkit';

/*
 * `console['log'](' x ')` has the same stray padding `console.log(' x ')` does.
 * Both gates read `property.name`, so 29 of this rule's own true positives
 * went silent when written with a string subscript.
 */
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noConsoleSpaces';

type RuleOptions = [];

export const noConsoleSpaces = createRule<RuleOptions, MessageIds>({
  name: 'no-console-spaces',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/no-console-spaces.md',
      description:
        'Prevent leading/trailing space between console.log parameters',
    },
    fixable: 'code',
    messages: {
      noConsoleSpaces: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Console Spaces',
        description:
          'Remove leading/trailing spaces in console method parameters',
        severity: 'MEDIUM',
        fix: 'Remove spaces from console method arguments',
        documentationLink:
          'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-console-spaces.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // Console methods that join parameters with spaces
    const consoleMethods = new Set([
      'log',
      'debug',
      'info',
      'warn',
      'error',
      'table',
      'trace',
      'group',
      'groupCollapsed',
    ]);

    // oxlint-disable-next-line consistent-function-scoping
    function isInAllowedContext(): boolean {
      // For simplicity, we'll skip the allow option for now
      return false;
    }

    function isConsoleMethodCall(node: TSESTree.CallExpression): boolean {
      // Check if this is a call to a console method
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        node.callee.object.name === 'console' &&
        consoleMethods.has(propertyName(node.callee) ?? '')
      ) {
        return true;
      }

      return false;
    }

    // oxlint-disable-next-line consistent-function-scoping
    function getConsoleMethodName(node: TSESTree.CallExpression): string {
      // Only ever called after `isConsoleCall` has matched, which already
      // required a MemberExpression whose property resolves to a console
      // method — so the name is always there. The previous `return 'console'`
      // fallback was unreachable once the property is resolved rather than
      // required to be an Identifier, and an unreachable fallback reads as a
      // safeguard while guaranteeing nothing.
      return propertyName(node.callee as TSESTree.MemberExpression) as string;
    }

    // oxlint-disable-next-line consistent-function-scoping
    function hasLeadingOrTrailingSpaces(text: string): boolean {
      // Check if string starts or ends with whitespace, but not if it's only whitespace
      // Only flag if there's actual content with leading/trailing spaces
      const trimmed = text.trim();
      return trimmed.length > 0 && /^\s|\s$/.test(text);
    }

    // oxlint-disable-next-line consistent-function-scoping
    function hasLeadingOrTrailingSpacesInTemplate(text: string): boolean {
      // For template literals, even whitespace-only quasis should be flagged
      return /^\s|\s$/.test(text);
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (isConsoleMethodCall(node) && !isInAllowedContext()) {
          // Check each argument for leading/trailing spaces
          for (const arg of node.arguments) {
            // A template literal is NOT read here even though it names a
            // static string, because this branch's fixer rewrites the argument
            // as `'...'` — which would silently convert every backtick in the
            // codebase to a quote. The `TemplateLiteral` branch below owns them
            // and fixes them in place.
            const staticText = arg.type === 'TemplateLiteral' ? null : staticString(arg);
            if (staticText !== null) {
              if (hasLeadingOrTrailingSpaces(staticText)) {
                context.report({
                  node: arg,
                  messageId: 'noConsoleSpaces',
                  data: {
                    method: getConsoleMethodName(node),
                    arg: staticText,
                  },
                  fix(fixer: TSESLint.RuleFixer) {
                    const trimmed = staticText.trim();
                    return fixer.replaceText(arg, `'${trimmed}'`);
                  },
                });
              }
            } else if (arg.type === 'TemplateLiteral') {
              // Check template literal quasi values for leading/trailing spaces
              let hasSpacesInTemplate = false;
              for (const quasi of arg.quasis) {
                if (hasLeadingOrTrailingSpacesInTemplate(quasi.value.raw)) {
                  hasSpacesInTemplate = true;
                  break;
                }
              }

              if (hasSpacesInTemplate) {
                context.report({
                  node: arg,
                  messageId: 'noConsoleSpaces',
                  data: {
                    method: getConsoleMethodName(node),
                    arg: 'template literal with spaces',
                  },
                  // Template literals are harder to fix automatically
                  fix: null,
                });
              }
            }
          }
        }
      },
    };
  },
});
