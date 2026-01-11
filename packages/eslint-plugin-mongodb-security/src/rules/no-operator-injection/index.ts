/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-operator-injection
 * Detects potential operator injection attacks ($ne, $gt, $lt, etc.)
 * CWE-943: NoSQL Injection
 *
 * @see https://cwe.mitre.org/data/definitions/943.html
 */
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'operatorInjection';

export interface Options {
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noOperatorInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-operator-injection',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent MongoDB operator injection attacks via user input',
    },
    hasSuggestions: true,
    messages: {
      operatorInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'MongoDB Operator Injection',
        cwe: 'CWE-943',
        owasp: 'A03:2021',
        cvss: 9.1,
        description: 'User input may contain MongoDB operators like { $ne: null } to bypass filters',
        severity: 'CRITICAL',
        fix: 'Use { field: { $eq: value } } pattern to prevent operator injection',
        documentationLink: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create() {
    // TODO: Implement rule logic
    return {};
  },
});

export default noOperatorInjection;
