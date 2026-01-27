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

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

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
      description: 'Prevent user data from being sent to LLM training endpoints',
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
      trainingPatterns: [
        'train', 'training', 'finetune', 'fine-tune', 'fine_tune',
        'feedback', 'improve', 'learn',
      ],
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const trainingPatterns = options.trainingPatterns ?? [
      'train', 'training', 'finetune', 'feedback',
    ];



    /**
     * Check if identifier suggests training
     */
    function isTrainingRelated(name: string): boolean {
      const lowerName = name.toLowerCase();
      return trainingPatterns.some((pattern: string) => 
        lowerName.includes(pattern.toLowerCase())
      );
    }

    return {
      // Check for training-related properties
      Property(node: TSESTree.Property) {
        const keyName = node.key.type === 'Identifier' 
          ? node.key.name 
          : node.key.type === 'Literal' 
            ? String(node.key.value)
            : null;

        if (!keyName) return;

        // Check for training flags like { training: true, allowTraining: true }
        if (isTrainingRelated(keyName)) {
          if (node.value.type === 'Literal' && node.value.value === true) {
            context.report({
              node,
              messageId: 'trainingDataExposure',
              data: { pattern: keyName },
            });
          }
        }
      },

      // Check for training endpoint URLs
      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== 'string') return;
        
        const value = node.value.toLowerCase();
        if (value.includes('/train') || 
            value.includes('/finetune') || 
            value.includes('/fine-tune') ||
            value.includes('/feedback')) {
          context.report({
            node,
            messageId: 'trainingDataExposure',
            data: { pattern: node.value },
          });
        }
      },
    };
  },
});
