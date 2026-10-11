/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require validation of AI output before display
 * @description Detects when AI output is displayed without validation
 * @see OWASP LLM09: Misinformation
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons, nameHasWord, propertyName } from '@interlace/eslint-devkit';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { calleeChain } from '../../utils/sdk';

type MessageIds = 'unvalidatedOutput';

export interface Options {
  /** Patterns suggesting display operations */
  displayPatterns?: string[];
  /** Functions that validate output */
  validatorFunctions?: string[];
}

type RuleOptions = [Options?];

export const requireOutputValidation = createRule<RuleOptions, MessageIds>({
  name: 'require-output-validation',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-output-validation.md',
      description: 'Require validation of AI output before displaying to users',
      cwe: 'CWE-707',
      cvss: 5,
    },
    messages: {
      unvalidatedOutput: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unvalidated AI Output',
        cwe: 'CWE-707',
        owasp: 'A03:2021',
        cvss: 5.0,
        description: 'AI output displayed via "{{method}}" without validation. This can propagate misinformation.',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: 'Validate AI output before display: display(validateOutput(result.text))',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          displayPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Patterns suggesting display operations',
          },
          validatorFunctions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Functions that validate output',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      displayPatterns: [
        'render', 'display', 'show', 'print', 'send', 'respond',
        'setContent', 'setText', 'setMessage', 'Response.json',
      ],
      validatorFunctions: [
        'validate', 'verify', 'check', 'sanitize', 'filter',
        'validateOutput', 'factCheck', 'verifyFacts',
      ],
    },
  ],
  create(context, [options]) {
    // Every rule in this plugin is Vercel-AI-specific, and none of them knew
    // it: over 107,384 files, 91% of this plugin's findings were in files with
    // no `ai` / `@ai-sdk` import. Registering no visitors is both the gate and
    // the cheap path — a file without the SDK does no work.
    if (!fileUsesVercelAi(context.sourceCode.ast)) return {};

    // Merged with `defaultOptions` before `create` runs.
    const { displayPatterns } = options as Required<Options>;

    // Track variables that hold AI results
    const aiResultVariables = new Set<string>();

    /**
     * `x.text`, `x.content`, `x.output` — by exact property name. `.message`
     * and `.response` were dropped: `err.message` is an exception and
     * `result.response` is the SDK's response metadata, not model output.
     */
    function isOutputProperty(node: TSESTree.Node): boolean {
      return (
        node.type === 'MemberExpression' &&
        AI_OUTPUT_PROPERTIES.has(propertyName(node) as string)
      );
    }

    function isAIOutput(node: TSESTree.Node): boolean {
      return (
        isOutputProperty(node) ||
        (node.type === 'Identifier' && aiResultVariables.has(node.name))
      );
    }

    return {
      // Track AI result assignments
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type !== 'Identifier') return;
        if (node.init && isOutputProperty(node.init)) {
          aiResultVariables.add(node.id.name);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Whole words of the call chain: `res.status(200).send` sends;
        // `showcaseItems` does not show.
        const chain = calleeChain(node.callee);
        if (!displayPatterns.some((pattern: string) => nameHasWord(chain, pattern))) return;

        // NOTE: `isAIOutput` only matches MemberExpression/Identifier nodes,
        // so a wrapped call like `render(validate(result.text))` never
        // reaches here — validated output is inherently not flagged.
        for (const arg of node.arguments) {
          if (isAIOutput(arg)) {
            context.report({
              node: arg,
              messageId: 'unvalidatedOutput',
              data: { method: calleeText(node) },
            });
          }

          if (arg.type === 'ObjectExpression') {
            for (const prop of arg.properties) {
              if (prop.type !== 'Property') continue;
              if (isAIOutput(prop.value)) {
                context.report({
                  node: prop.value,
                  messageId: 'unvalidatedOutput',
                  data: { method: calleeText(node) },
                });
              }
            }
          }
        }
      },
    };

    function calleeText(node: TSESTree.CallExpression): string {
      return context.sourceCode.getText(node.callee);
    }
  },
});

const AI_OUTPUT_PROPERTIES = new Set(['text', 'content', 'output']);
