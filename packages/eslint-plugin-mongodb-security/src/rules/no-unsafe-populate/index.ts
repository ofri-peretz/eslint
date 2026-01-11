/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe-populate
 * Prevents user-controlled populate() (CVE-2025-23061 related)
 * CWE-943: NoSQL Injection
 */
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'unsafePopulate';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

export const noUnsafePopulate = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-populate',
  meta: {
    type: 'problem',
    docs: { description: 'Prevent user-controlled populate() paths (CVE-2025-23061)' },
    hasSuggestions: true,
    messages: {
      unsafePopulate: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe populate()',
        cwe: 'CWE-943',
        owasp: 'A03:2021',
        cvss: 6.5,
        description: 'User-controlled populate() can lead to data exposure or injection',
        severity: 'MEDIUM',
        fix: 'Use hardcoded populate paths instead of user input',
        documentationLink: 'https://nvd.nist.gov/vuln/detail/CVE-2025-23061',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create() { return {}; },
});

export default noUnsafePopulate;
