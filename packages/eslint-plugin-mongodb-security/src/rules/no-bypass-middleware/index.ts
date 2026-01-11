/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-bypass-middleware
 * Prevents bypassing Mongoose middleware
 * CWE-284: Improper Access Control
 */
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'bypassMiddleware';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

export const noBypassMiddleware = createRule<RuleOptions, MessageIds>({
  name: 'no-bypass-middleware',
  meta: {
    type: 'suggestion',
    docs: { description: 'Prevent bypassing Mongoose pre/post middleware hooks' },
    hasSuggestions: true,
    messages: {
      bypassMiddleware: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Middleware Bypass',
        cwe: 'CWE-284',
        owasp: 'A01:2021',
        cvss: 5.3,
        description: 'This method bypasses Mongoose middleware hooks',
        severity: 'MEDIUM',
        fix: 'Use findOne + save() pattern to ensure middleware runs',
        documentationLink: 'https://mongoosejs.com/docs/middleware.html',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create() { return {}; },
});

export default noBypassMiddleware;
