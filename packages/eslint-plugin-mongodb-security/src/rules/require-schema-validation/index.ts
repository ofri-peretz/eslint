/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-schema-validation
 * Requires Mongoose schema validation
 * CWE-20: Improper Input Validation
 */
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'requireSchemaValidation';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

export const requireSchemaValidation = createRule<RuleOptions, MessageIds>({
  name: 'require-schema-validation',
  meta: {
    type: 'suggestion',
    docs: { description: 'Require validation on Mongoose schema fields' },
    hasSuggestions: true,
    messages: {
      requireSchemaValidation: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Missing Schema Validation',
        cwe: 'CWE-20',
        owasp: 'A04:2021',
        cvss: 6.1,
        description: 'Mongoose schema field lacks validation',
        severity: 'MEDIUM',
        fix: 'Add required, validate, or enum options to schema field',
        documentationLink: 'https://mongoosejs.com/docs/validation.html',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create() { return {}; },
});

export default requireSchemaValidation;
