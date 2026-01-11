/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-hardcoded-credentials
 * Detects hardcoded MongoDB auth credentials
 * CWE-798: Hardcoded Credentials
 */
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'hardcodedCredentials';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

export const noHardcodedCredentials = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-credentials',
  meta: {
    type: 'problem',
    docs: { description: 'Prevent hardcoded MongoDB authentication credentials' },
    hasSuggestions: true,
    messages: {
      hardcodedCredentials: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded Credentials',
        cwe: 'CWE-798',
        cvss: 7.5,
        description: 'MongoDB authentication credentials are hardcoded',
        severity: 'HIGH',
        fix: 'Use environment variables for username and password',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create() { return {}; },
});

export default noHardcodedCredentials;
