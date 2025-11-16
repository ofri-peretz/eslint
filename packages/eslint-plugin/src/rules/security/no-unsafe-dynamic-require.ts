/**
 * ESLint Rule: no-unsafe-dynamic-require
 * Detects dynamic require() calls that could lead to code injection
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds = 'unsafeDynamicRequire' | 'useStaticImport' | 'useAllowlist';

export interface Options {
  /** Allow dynamic import() expressions. Default: false (stricter) */
  allowDynamicImport?: boolean;
}

type RuleOptions = [Options?];

export const noUnsafeDynamicRequire = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-dynamic-require',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent unsafe dynamic require() calls that could enable code injection',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      // 🎯 Token optimization: 40% reduction (54→32 tokens) - compact format for LLM efficiency
      unsafeDynamicRequire: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dynamic require()',
        cwe: 'CWE-95',
        description: 'Dynamic require() detected',
        severity: 'CRITICAL',
        fix: 'Use allowlist: const ALLOWED = ["mod1", "mod2"]; if (!ALLOWED.includes(name)) throw Error("Not allowed")',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      useStaticImport: '✅ Use static import',
      useAllowlist: '✅ Add path validation with allowlist',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowDynamicImport: {
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
      allowDynamicImport: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {

    const sourceCode = context.sourceCode || context.getSourceCode();

    /**
     * Check if argument is dynamic (not a literal)
     */
    const isDynamicArgument = (arg: TSESTree.Expression | TSESTree.SpreadElement): boolean => {
      if (arg.type === 'Literal') return false;
      if (arg.type === 'TemplateLiteral' && arg.expressions.length === 0) return false;
      return true;
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check for require() calls
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'require') {
          return;
        }

        // Must have at least one argument
        if (node.arguments.length === 0) return;

        const firstArg = node.arguments[0];
        if (firstArg.type === 'SpreadElement') return;

        // Check if dynamic
        if (!isDynamicArgument(firstArg)) return;

        const argText = sourceCode.getText(firstArg);

        context.report({
          node,
          messageId: 'unsafeDynamicRequire',
          data: {
            risk: 'CRITICAL',
            attack: 'Arbitrary Code Execution',
            currentExample: `require(${argText})`,
            fixExample: `const ALLOWED = ['mod1', 'mod2']; if (!ALLOWED.includes(${argText})) throw new Error('Not allowed'); const mod = require(${argText});`,
          },
        });
      },
    };
  },
});

