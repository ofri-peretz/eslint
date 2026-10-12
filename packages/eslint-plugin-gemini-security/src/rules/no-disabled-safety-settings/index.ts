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

import {
  TSESTree,
  createRule,
  createModuleEvidence,
  createModuleListMatcher,
  followConst,
  formatLLMMessage,
  MessageIcons,
  objectKeyName,
  propertyName,
  resolveSdkExport,
} from '@interlace/eslint-devkit';

type MessageIds = 'safetyDisabled';

const GEMINI_PACKAGES = ['@google/genai', '@google/generative-ai'];

/**
 * The rule only arms in files that load the Google GenAI SDK.
 *
 * Through the devkit probe rather than a pair of visitors: the hand-rolled gate
 * matched `ImportDeclaration` and a call to something literally named
 * `require`, so `import genai = require('@google/genai')` and a lazy
 * `await import('@google/genai')` left the rule silently switched off.
 */
const fileUsesGemini = createModuleEvidence({ packages: GEMINI_PACKAGES });

/** Does a binding come from one of the Gemini SDKs? */
const ownsGemini = createModuleListMatcher(GEMINI_PACKAGES);

const THRESHOLD_PROP = 'threshold';
/** Values that switch the filter off entirely. */
const DISABLING_VALUES = new Set(['BLOCK_NONE', 'OFF']);

/**
 * Is this `threshold` property part of a Gemini `SafetySetting`?
 *
 * `threshold: 'OFF'` is also how a circuit breaker, a log level or a lint
 * severity is spelled, and a file that calls Gemini can hold all of those. The
 * SDK's own shape is `{ category, threshold }` inside `safetySettings`, so one
 * of the two must be there: a `category` beside it, or an enclosing
 * `safetySettings: [ … ]`. Key names here are the SDK's request schema, not
 * variable names.
 */
function isSafetySetting(property: TSESTree.Property): boolean {
  const owner = property.parent as TSESTree.ObjectExpression;
  const hasCategory = owner.properties.some(
    (sibling) =>
      sibling.type === 'Property' && objectKeyName(sibling) === 'category',
  );
  if (hasCategory) return true;
  const list = owner.parent;
  const holder = list?.type === 'ArrayExpression' ? list.parent : undefined;
  return (
    holder?.type === 'Property' && objectKeyName(holder) === 'safetySettings'
  );
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
        documentationLink:
          'https://ai.google.dev/gemini-api/docs/safety-settings',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Asked once, up front, over the whole AST, so the verdict no longer
    // depends on the SDK being loaded in one of two spellings.
    if (!fileUsesGemini(context.sourceCode.ast)) return {};
    const sourceCode = context.sourceCode;

    /**
     * The disabling constant a threshold resolves to, and whether that
     * constant is the SDK's own enum member (`HarmBlockThreshold.BLOCK_NONE`
     * resolved through its import) rather than a bare string.
     */
    function disablingValueOf(
      value: TSESTree.Node,
    ): { name: string; fromSdk: boolean } | null {
      const resolved = followConst(value, sourceCode);
      if (resolved.type === 'Literal') {
        return typeof resolved.value === 'string' &&
          DISABLING_VALUES.has(resolved.value)
          ? { name: resolved.value, fromSdk: false }
          : null;
      }
      if (resolved.type !== 'MemberExpression') return null;
      const name = propertyName(resolved);
      if (name === null || !DISABLING_VALUES.has(name)) return null;
      return {
        name,
        fromSdk:
          resolveSdkExport(resolved.object, sourceCode, ownsGemini) !==
          undefined,
      };
    }

    return {
      Property(node: TSESTree.Property) {
        if (objectKeyName(node) !== THRESHOLD_PROP) return;
        if (node.parent.type !== 'ObjectExpression') return;
        const value = disablingValueOf(node.value);
        if (value === null) return;
        // The SDK's enum is evidence on its own; a bare string or a
        // look-alike enum needs the SafetySetting shape around it.
        if (!value.fromSdk && !isSafetySetting(node)) return;
        context.report({
          node,
          messageId: 'safetyDisabled',
          data: { value: value.name },
        });
      },
    };
  },
});
