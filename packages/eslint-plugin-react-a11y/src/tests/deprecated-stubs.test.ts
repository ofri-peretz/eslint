/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `accessible-emoji`, `label-has-for` and `no-onchange` are deprecated in
 * eslint-plugin-jsx-a11y 6.10.2 and exist here as no-ops, so that a config or a
 * disable comment naming them loads instead of throwing "Could not find rule".
 *
 * What upstream sets (`lib/rules/*.js` at v6.10.2): all three carry
 * `meta.deprecated: true`; only `label-has-for` names a replacement
 * (`replacedBy: ['label-has-associated-control']`). Upstream's presets set
 * `label-has-for` to `off` (src/index.js, in both) and name the other two in no
 * preset.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import plugin, { configs, rules } from '../index';

const JSX = { parserOptions: { ecmaFeatures: { jsx: true } } };

/** The code upstream's own rule reports, so "silent" is a real claim. */
const STUBS = [
  {
    name: 'accessible-emoji',
    replacedBy: undefined,
    flaggedUpstream: '<span>🐼</span>',
    options: [{}],
  },
  {
    name: 'label-has-for',
    replacedBy: ['label-has-associated-control'],
    flaggedUpstream: '<label>Name</label>',
    // `components`, `required` (string, `some`, `every`) and `allowChildren`,
    // the three keys of upstream's schema.
    options: [
      { components: ['Label'], required: 'id', allowChildren: true },
      { required: { some: ['nesting', 'id'] } },
      { required: { every: ['nesting', 'id'] } },
    ],
  },
  {
    name: 'no-onchange',
    replacedBy: undefined,
    flaggedUpstream: '<select onChange={go}><option /></select>',
    options: [{}],
  },
] as const;

describe('deprecated jsx-a11y rules kept as no-ops', () => {
  describe.each(STUBS)(
    '$name',
    ({ name, replacedBy, flaggedUpstream, options }) => {
      it('is registered and marked deprecated', () => {
        const rule = rules[name];
        expect(rule, name).toBeDefined();
        expect(rule.meta?.deprecated).toBe(true);
        expect(rule.meta?.replacedBy).toEqual(replacedBy);
      });

      it.each(['off', 'warn', 'error'] as const)(
        'a config that names it as %s under the jsx-a11y key loads',
        (severity) => {
          for (const option of options) {
            const messages = new Linter().verify(
              flaggedUpstream,
              [
                {
                  files: ['**/*.jsx'],
                  languageOptions: JSX,
                  plugins: { 'jsx-a11y': plugin },
                  rules: { [`jsx-a11y/${name}`]: [severity, option] } as never,
                },
              ],
              { filename: 'a.jsx' },
            );
            expect(messages).toEqual([]);
          }
        },
      );

      it('is not switched on by any preset', () => {
        for (const [preset, config] of Object.entries(configs)) {
          expect(Object.keys(config.rules ?? {}), preset).not.toContain(
            `react-a11y/${name}`,
          );
        }
      });
    },
  );

  it('label-has-for still rejects an option upstream rejects', () => {
    expect(() =>
      new Linter().verify(
        '<label />',
        [
          {
            files: ['**/*.jsx'],
            languageOptions: JSX,
            plugins: { 'jsx-a11y': plugin },
            rules: {
              'jsx-a11y/label-has-for': ['error', { required: 'sibling' }],
            },
          },
        ],
        { filename: 'a.jsx' },
      ),
    ).toThrow(/Key "jsx-a11y\/label-has-for":\s+Value "sibling"/);
  });
});
