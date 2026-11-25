/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: accessible-emoji (deprecated, no-op)
 *
 * eslint-plugin-jsx-a11y 6.10.2 deprecates this rule without naming a
 * replacement (`meta.deprecated: true`, no `replacedBy`): browsers and screen
 * readers announce emoji natively. It exists here only so that a config or a
 * disable comment naming `accessible-emoji` loads instead of throwing "Could
 * not find rule". It reports nothing.
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/v6.10.2/docs/rules/accessible-emoji.md
 */
import { createRule } from '@interlace/eslint-devkit';

type RuleOptions = [Record<string, unknown>?];

export const accessibleEmoji = createRule<RuleOptions, never>({
  name: 'accessible-emoji',
  meta: {
    interop: { runtimes: ['eslint'] },
    type: 'problem',
    deprecated: true,
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/accessible-emoji.md',
      description:
        'Deprecated no-op kept for eslint-plugin-jsx-a11y configs: emoji are announced natively, so nothing is reported',
    },
    messages: {},
    // Accepts what upstream's `generateObjSchema()` does: any object.
    // The empty `properties` adds no constraint.
    schema: [{ type: 'object', properties: {} }],
  },
  defaultOptions: [{}],
  createOnce() {
    return {};
  },
});
