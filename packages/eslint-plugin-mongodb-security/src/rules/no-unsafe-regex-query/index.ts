/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe-regex-query
 * Detects ReDoS and injection via $regex operator
 * CWE-400: Resource Exhaustion
 */
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'unsafeRegex';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

export const noUnsafeRegexQuery = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-regex-query',
  meta: {
    type: 'problem',
    docs: { description: 'Prevent ReDoS attacks via $regex with user input' },
    hasSuggestions: true,
    messages: {
      unsafeRegex: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'ReDoS via $regex',
        cwe: 'CWE-400',
        owasp: 'A03:2021',
        cvss: 7.5,
        description: 'User input in $regex can cause ReDoS or information disclosure',
        severity: 'HIGH',
        fix: 'Escape special regex characters and anchor patterns',
        documentationLink: 'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create() { return {}; },
});

export default noUnsafeRegexQuery;
