/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent training data exposure to LLM providers
 * @description Detects when user data is sent to training endpoints or with training flags
 * @see OWASP LLM03: Training Data Poisoning
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons, nameHasWord, objectKeyName } from '@interlace/eslint-devkit';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';

type MessageIds = 'trainingDataExposure';

export interface Options {
  /** Patterns suggesting training endpoints or flags */
  trainingPatterns?: string[];
}

type RuleOptions = [Options?];

export const noTrainingDataExposure = createRule<RuleOptions, MessageIds>({
  name: 'no-training-data-exposure',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/no-training-data-exposure.md',
      description: 'Prevent user data from being sent to LLM training endpoints',
      cwe: 'CWE-359',
      cvss: 7,
    },
    messages: {
      trainingDataExposure: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Training Data Exposure',
        cwe: 'CWE-359',
        owasp: 'A01:2021',
        cvss: 7.0,
        description: 'User data may be exposed for model training via "{{pattern}}". This can lead to data poisoning and privacy violations.',
        severity: 'HIGH',
        compliance: ['GDPR', 'SOC2'],
        fix: 'Disable training data collection or avoid sending PII to training endpoints',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          trainingPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Patterns suggesting training endpoints',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      // Whole words of a flag name. `feedback`, `improve` and `learn` were
      // dropped: `showFeedback`, `improveContrast` and `learnMore` are UI
      // flags, and none of them says anything about model training.
      trainingPatterns: ['train', 'training', 'finetune', 'fine-tune', 'fine_tune'],
    },
  ],
  create(context, [options]) {
    // Every rule in this plugin is Vercel-AI-specific, and none of them knew
    // it: over 107,384 files, 91% of this plugin's findings were in files with
    // no `ai` / `@ai-sdk` import. Registering no visitors is both the gate and
    // the cheap path — a file without the SDK does no work.
    if (!fileUsesVercelAi(context.sourceCode.ast)) return {};

    // Merged with `defaultOptions` before `create` runs.
    const { trainingPatterns } = options as Required<Options>;

    return {
      // Training flags like { training: true, allowTraining: true }
      Property(node: TSESTree.Property) {
        const keyName = objectKeyName(node);
        if (keyName === null) return;
        if (node.value.type !== 'Literal' || node.value.value !== true) return;
        if (!trainingPatterns.some((pattern: string) => nameHasWord(keyName, pattern))) return;
        context.report({
          node,
          messageId: 'trainingDataExposure',
          data: { pattern: keyName },
        });
      },

      // Training endpoints, matched by whole path segment: `/v1/fine_tuning/jobs`
      // and `/api/train/model`, not `/trainers` or `/training-schedule`.
      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== 'string') return;
        const path = node.value.toLowerCase().split(/[?#]/)[0];
        if (!path.split('/').slice(1).some((segment) => TRAINING_SEGMENTS.has(segment))) return;
        context.report({
          node,
          messageId: 'trainingDataExposure',
          data: { pattern: node.value },
        });
      },
    };
  },
});

/** URL path segments of training / fine-tuning endpoints. */
const TRAINING_SEGMENTS = new Set([
  'train', 'training', 'finetune', 'finetunes', 'fine-tune', 'fine-tunes',
  'fine_tune', 'fine_tunes', 'fine-tuning', 'fine_tuning',
]);
