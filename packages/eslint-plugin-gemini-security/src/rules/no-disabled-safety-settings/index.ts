/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Forbid turning Gemini harm filters off
 * @description `threshold: BLOCK_NONE` (or `OFF`) disables the model's content
 * filter for that harm category. On a surface that shows model output to users
 * — or feeds it to another system — that removes the only server-side control
 * over what the model is allowed to emit.
 * @see https://ai.google.dev/gemini-api/docs/safety-settings
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'safetyDisabled';

/** The rule only arms in files that import the Google GenAI SDK. */
const GEMINI_MODULE_PREFIXES = ['@google/genai', '@google/generative-ai'];

const THRESHOLD_PROP = 'threshold';
/** Values that switch the filter off entirely. */
const DISABLING_VALUES = new Set(['BLOCK_NONE', 'OFF']);

function isGeminiModule(source: string): boolean {
  return GEMINI_MODULE_PREFIXES.some((prefix) => source.startsWith(prefix));
}

/** The disabling constant a threshold value resolves to, if it is readable. */
function disablingValueOf(value: TSESTree.Node): string | null {
  // threshold: 'BLOCK_NONE'
  if (value.type === 'Literal') {
    return typeof value.value === 'string' && DISABLING_VALUES.has(value.value) ? value.value : null;
  }
  // threshold: HarmBlockThreshold.BLOCK_NONE
  if (value.type === 'MemberExpression' && !value.computed && value.property.type === 'Identifier') {
    return DISABLING_VALUES.has(value.property.name) ? value.property.name : null;
  }
  // Anything else (a variable, a call) is not readable here — not reported.
  return null;
}

export const noDisabledSafetySettings = createRule<[], MessageIds>({
  name: 'no-disabled-safety-settings',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-gemini-security/docs/rules/no-disabled-safety-settings.md',
      description: 'Forbid disabling Gemini harm-category filters',
      cwe: 'CWE-693',
      cvss: 7.4,
    },
    messages: {
      safetyDisabled: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Gemini Safety Filter Disabled',
        cwe: 'CWE-693',
        owasp: 'A04:2021',
        cvss: 7.4,
        description:
          'threshold: {{value}} switches the harm filter off for this category, removing the server-side control over model output',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Use a real threshold — BLOCK_ONLY_HIGH, BLOCK_MEDIUM_AND_ABOVE or BLOCK_LOW_AND_ABOVE',
        documentationLink: 'https://ai.google.dev/gemini-api/docs/safety-settings',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    let importsGemini = false;
    const candidates: Array<{ node: TSESTree.Node; value: string }> = [];

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (isGeminiModule(node.source.value)) importsGemini = true;
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments[0]?.type === 'Literal' &&
          typeof node.arguments[0].value === 'string' &&
          isGeminiModule(node.arguments[0].value)
        ) {
          importsGemini = true;
        }
      },

      Property(node: TSESTree.Property) {
        if (node.computed) return;
        const isThreshold =
          (node.key.type === 'Identifier' && node.key.name === THRESHOLD_PROP) ||
          (node.key.type === 'Literal' && node.key.value === THRESHOLD_PROP);
        if (!isThreshold) return;

        const value = disablingValueOf(node.value);
        if (value !== null) candidates.push({ node, value });
      },

      'Program:exit'() {
        if (!importsGemini) return;
        for (const { node, value } of candidates) {
          context.report({ node, messageId: 'safetyDisabled', data: { value } });
        }
      },
    };
  },
});
