/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require step limits for multi-step AI tool calls
 * @description Ensures multi-step tool calling has maxSteps to prevent infinite loops
 * @see https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
 * @see OWASP LLM10: Unbounded Consumption
 */

import { AST_NODE_TYPES, TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { calleeName, isRequestDerived, optionValue, sdkCallName } from '../../utils/sdk';

type MessageIds = 'unboundedSteps';

export interface Options {
  /** Default max steps to suggest */
  suggestedMaxSteps?: number;
}

type RuleOptions = [Options?];

export const requireMaxSteps = createRule<RuleOptions, MessageIds>({
  name: 'require-max-steps',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-max-steps.md',
      description: 'Disallow unbounded multi-step tool loops (hasToolCall-only stop conditions, request-controlled step limits)',
      cwe: 'CWE-834',
      cvss: 6.5,
    },
    messages: {
      unboundedSteps: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unbounded Multi-Step Tool Loop',
        cwe: 'CWE-834',
        owasp: 'A05:2021',
        cvss: 6.5,
        description: '{{function}} with tools sets a step limit that does not bound the loop ({{reason}}).',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: 'Bound the loop with a server-side constant: stopWhen: [hasToolCall(...), stepCountIs(20)] (v5+) or maxSteps: 20 (v4)',
        documentationLink: 'https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#multi-step-calls-using-stopwhen',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          suggestedMaxSteps: {
            type: 'number',
            description: 'Default max steps limit to suggest',
            default: 5,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      suggestedMaxSteps: 5,
    },
  ],
  create(context) {
    // Every rule in this plugin is Vercel-AI-specific, and none of them knew
    // it: over 107,384 files, 91% of this plugin's findings were in files with
    // no `ai` / `@ai-sdk` import. Registering no visitors is both the gate and
    // the cheap path — a file without the SDK does no work.
    if (!fileUsesVercelAi(context.sourceCode.ast)) return {};

    const sourceCode = context.sourceCode;

    /**
     * Why this step setting fails to bound the loop, or `null` if it does.
     *
     * Absent settings are NOT reported: with no `maxSteps` / `stopWhen` the SDK
     * runs exactly one step (v4 `maxSteps: 1`, v5+ `stopWhen: stepCountIs(1)`).
     */
    function unboundedReason(key: string, value: TSESTree.Node): string | null {
      const scope = sourceCode.getScope(value);
      if (isRequestDerived(value, scope)) return `${key} comes from the request`;
      if (value.type === AST_NODE_TYPES.Identifier && value.name === 'Infinity') {
        return `${key} is Infinity`;
      }
      if (key !== 'stopWhen') return null;

      const conditions = value.type === AST_NODE_TYPES.ArrayExpression ? value.elements : [value];
      const named = conditions.map((c) =>
        c?.type === AST_NODE_TYPES.CallExpression ? calleeName(c.callee) : null,
      );
      if (named.every((name) => name === 'hasToolCall')) {
        return 'hasToolCall only stops if the model calls that tool';
      }
      for (const condition of conditions) {
        if (
          condition?.type === AST_NODE_TYPES.CallExpression &&
          STEP_COUNTERS.has(calleeName(condition.callee) as string) &&
          condition.arguments.some((arg) => isRequestDerived(arg, scope))
        ) {
          return 'the step count comes from the request';
        }
      }
      return null;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const matchedFunction = sdkCallName(node, FUNCTIONS_WITH_TOOLS);
        if (!matchedFunction) return;

        const optionsArg = node.arguments[0];
        if (optionsArg?.type !== AST_NODE_TYPES.ObjectExpression) return;
        if (!optionValue(optionsArg, 'tools')) return;

        for (const key of STEP_KEYS) {
          const value = optionValue(optionsArg, key);
          const reason = value && unboundedReason(key, value);
          if (reason) {
            context.report({
              node: value,
              messageId: 'unboundedSteps',
              data: { function: matchedFunction, reason },
            });
          }
        }
      },
    };
  },
});

/** SDK functions that run the tool loop. */
const FUNCTIONS_WITH_TOOLS = ['generateText', 'streamText'];

/** Option names that set the step limit, v4 and v5+. */
const STEP_KEYS = ['maxSteps', 'max_steps', 'stopWhen'];

/** Stop conditions that count steps (`isStepCount` is the v7 name). */
const STEP_COUNTERS = new Set(['stepCountIs', 'isStepCount']);
