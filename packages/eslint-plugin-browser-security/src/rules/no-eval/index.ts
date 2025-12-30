/**
 * ESLint Rule: no-eval
 * Detects dangerous eval() and similar code execution patterns
 * CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code (Eval Injection)
 *
 * @see https://cwe.mitre.org/data/definitions/95.html
 * @see https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/11-Testing_for_Code_Injection
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';

type MessageIds = 'dangerousEval' | 'useSafeAlternative';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;

  /** Allow Function constructor. Default: false */
  allowFunctionConstructor?: boolean;
}

type RuleOptions = [Options?];

const DANGEROUS_FUNCTIONS = new Set([
  'eval',
  'execScript', // IE legacy
]);

const DANGEROUS_METHODS_WITH_STRING_ARG = new Set([
  'setTimeout',
  'setInterval',
  'setImmediate',
]);

export const noEval = createRule<RuleOptions, MessageIds>({
  name: 'no-eval',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow eval(), Function(), and other code execution patterns',
    },
    hasSuggestions: true,
    messages: {
      dangerousEval: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Code Injection via {{function}}',
        cwe: 'CWE-95',
        description:
          'Using {{function}} with dynamic input can execute arbitrary code. This is a critical security vulnerability.',
        severity: 'CRITICAL',
        fix: 'Use safe alternatives like JSON.parse() for data, or refactor to avoid dynamic code execution.',
        documentationLink:
          'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      useSafeAlternative: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Safe Alternative',
        description: 'Replace with a safe alternative',
        severity: 'LOW',
        fix: 'Use JSON.parse() for JSON, or define functions statically.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
          },
          allowFunctionConstructor: {
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
      allowInTests: false,
      allowFunctionConstructor: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = false, allowFunctionConstructor = false } =
      options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for eval(), execScript()
        if (callee.type === 'Identifier') {
          if (DANGEROUS_FUNCTIONS.has(callee.name)) {
            context.report({
              node,
              messageId: 'dangerousEval',
              data: { function: callee.name },
              suggest: [
                {
                  messageId: 'useSafeAlternative',
                  fix: () => null,
                },
              ],
            });
            return;
          }

          // Check for setTimeout/setInterval with string argument
          if (DANGEROUS_METHODS_WITH_STRING_ARG.has(callee.name)) {
            const firstArg = node.arguments[0];
            if (
              firstArg &&
              firstArg.type === 'Literal' &&
              typeof firstArg.value === 'string'
            ) {
              context.report({
                node,
                messageId: 'dangerousEval',
                data: { function: `${callee.name} with string` },
                suggest: [
                  {
                    messageId: 'useSafeAlternative',
                    fix: () => null,
                  },
                ],
              });
            }
          }
        }

        // Check for window.eval, global.eval
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          DANGEROUS_FUNCTIONS.has(callee.property.name)
        ) {
          context.report({
            node,
            messageId: 'dangerousEval',
            data: { function: callee.property.name },
            suggest: [
              {
                messageId: 'useSafeAlternative',
                fix: () => null,
              },
            ],
          });
        }
      },

      // Check for new Function()
      NewExpression(node: TSESTree.NewExpression) {
        if (allowFunctionConstructor) {
          return;
        }

        const callee = node.callee;
        if (callee.type === 'Identifier' && callee.name === 'Function') {
          context.report({
            node,
            messageId: 'dangerousEval',
            data: { function: 'Function constructor' },
            suggest: [
              {
                messageId: 'useSafeAlternative',
                fix: () => null,
              },
            ],
          });
        }
      },
    };
  },
});
