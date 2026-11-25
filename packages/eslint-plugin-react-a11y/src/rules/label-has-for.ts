/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: label-has-for (deprecated, no-op)
 *
 * eslint-plugin-jsx-a11y 6.10.2 deprecates this rule in favour of
 * `label-has-associated-control` (`replacedBy`). It exists here only so that a
 * config or a disable comment naming `label-has-for` loads instead of throwing
 * "Could not find rule"; both presets of upstream set it to `off`. It reports
 * nothing: enable `label-has-associated-control` instead.
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/v6.10.2/docs/rules/label-has-for.md
 */
import { createRule } from '@interlace/eslint-devkit';

type RuleOptions = [Record<string, unknown>?];

const ENUM_VALUES = ['nesting', 'id'];

const enumArray = {
  type: 'array',
  items: { type: 'string', enum: ENUM_VALUES },
  uniqueItems: true,
  additionalItems: false,
  minItems: 0,
} as const;

export const labelHasFor = createRule<RuleOptions, never>({
  name: 'label-has-for',
  meta: {
    interop: { runtimes: ['eslint'] },
    type: 'problem',
    deprecated: true,
    replacedBy: ['label-has-associated-control'],
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/label-has-for.md',
      description:
        'Deprecated no-op kept for eslint-plugin-jsx-a11y configs: use label-has-associated-control, nothing is reported',
    },
    messages: {},
    // Upstream's schema (rules/label-has-for.js, v6.10.2): accepted, not read.
    schema: [
      {
        type: 'object',
        properties: {
          components: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
            additionalItems: false,
          },
          required: {
            oneOf: [
              { type: 'string', enum: ENUM_VALUES },
              {
                type: 'object',
                properties: { some: enumArray },
                required: ['some'],
              },
              {
                type: 'object',
                properties: { every: enumArray },
                required: ['every'],
              },
            ],
          },
          allowChildren: { type: 'boolean' },
        },
      },
    ],
  },
  defaultOptions: [{}],
  createOnce() {
    return {};
  },
});
