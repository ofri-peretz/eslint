/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-jsx-a11y's own presets must load against these rules.
 *
 * A config that registers this plugin under the `jsx-a11y` key
 * (`plugins: { 'jsx-a11y': reactA11y }`) keeps its rule IDs and its options.
 * The two objects below are copied unchanged from upstream's `src/index.js` at
 * tag v6.10.2 (https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/v6.10.2/src/index.js):
 * `recommendedRules` is its lines 48-201 and `strictRules` its lines 203-285.
 * Until the option schemas were loosened, ESLint threw "Unexpected property"
 * on `includeRoles`, on the element keys of `no-noninteractive-element-interactions`
 * and on `allowExpressionValues`.
 *
 * Loading is the contract here; what each option does is tested in the rule's
 * own file (`control-has-associated-label.test.ts`, `alt-text.test.ts`, ...).
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import plugin from '../index';

/* ---- begin copy of upstream src/index.js (v6.10.2) lines 48-285 ---- */
const recommendedRules = {
  'jsx-a11y/alt-text': 'error',
  'jsx-a11y/anchor-ambiguous-text': 'off', // TODO: error
  'jsx-a11y/anchor-has-content': 'error',
  'jsx-a11y/anchor-is-valid': 'error',
  'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
  'jsx-a11y/aria-props': 'error',
  'jsx-a11y/aria-proptypes': 'error',
  'jsx-a11y/aria-role': 'error',
  'jsx-a11y/aria-unsupported-elements': 'error',
  'jsx-a11y/autocomplete-valid': 'error',
  'jsx-a11y/click-events-have-key-events': 'error',
  'jsx-a11y/control-has-associated-label': [
    'off',
    {
      ignoreElements: [
        'audio',
        'canvas',
        'embed',
        'input',
        'textarea',
        'tr',
        'video',
      ],
      ignoreRoles: [
        'grid',
        'listbox',
        'menu',
        'menubar',
        'radiogroup',
        'row',
        'tablist',
        'toolbar',
        'tree',
        'treegrid',
      ],
      includeRoles: ['alert', 'dialog'],
    },
  ],
  'jsx-a11y/heading-has-content': 'error',
  'jsx-a11y/html-has-lang': 'error',
  'jsx-a11y/iframe-has-title': 'error',
  'jsx-a11y/img-redundant-alt': 'error',
  'jsx-a11y/interactive-supports-focus': [
    'error',
    {
      tabbable: [
        'button',
        'checkbox',
        'link',
        'searchbox',
        'spinbutton',
        'switch',
        'textbox',
      ],
    },
  ],
  'jsx-a11y/label-has-associated-control': 'error',
  'jsx-a11y/label-has-for': 'off',
  'jsx-a11y/media-has-caption': 'error',
  'jsx-a11y/mouse-events-have-key-events': 'error',
  'jsx-a11y/no-access-key': 'error',
  'jsx-a11y/no-autofocus': 'error',
  'jsx-a11y/no-distracting-elements': 'error',
  'jsx-a11y/no-interactive-element-to-noninteractive-role': [
    'error',
    {
      tr: ['none', 'presentation'],
      canvas: ['img'],
    },
  ],
  'jsx-a11y/no-noninteractive-element-interactions': [
    'error',
    {
      handlers: [
        'onClick',
        'onError',
        'onLoad',
        'onMouseDown',
        'onMouseUp',
        'onKeyPress',
        'onKeyDown',
        'onKeyUp',
      ],
      alert: ['onKeyUp', 'onKeyDown', 'onKeyPress'],
      body: ['onError', 'onLoad'],
      dialog: ['onKeyUp', 'onKeyDown', 'onKeyPress'],
      iframe: ['onError', 'onLoad'],
      img: ['onError', 'onLoad'],
    },
  ],
  'jsx-a11y/no-noninteractive-element-to-interactive-role': [
    'error',
    {
      ul: [
        'listbox',
        'menu',
        'menubar',
        'radiogroup',
        'tablist',
        'tree',
        'treegrid',
      ],
      ol: [
        'listbox',
        'menu',
        'menubar',
        'radiogroup',
        'tablist',
        'tree',
        'treegrid',
      ],
      li: [
        'menuitem',
        'menuitemradio',
        'menuitemcheckbox',
        'option',
        'row',
        'tab',
        'treeitem',
      ],
      table: ['grid'],
      td: ['gridcell'],
      fieldset: ['radiogroup', 'presentation'],
    },
  ],
  'jsx-a11y/no-noninteractive-tabindex': [
    'error',
    {
      tags: [],
      roles: ['tabpanel'],
      allowExpressionValues: true,
    },
  ],
  'jsx-a11y/no-redundant-roles': 'error',
  'jsx-a11y/no-static-element-interactions': [
    'error',
    {
      allowExpressionValues: true,
      handlers: [
        'onClick',
        'onMouseDown',
        'onMouseUp',
        'onKeyPress',
        'onKeyDown',
        'onKeyUp',
      ],
    },
  ],
  'jsx-a11y/role-has-required-aria-props': 'error',
  'jsx-a11y/role-supports-aria-props': 'error',
  'jsx-a11y/scope': 'error',
  'jsx-a11y/tabindex-no-positive': 'error',
};

const strictRules = {
  'jsx-a11y/alt-text': 'error',
  'jsx-a11y/anchor-has-content': 'error',
  'jsx-a11y/anchor-is-valid': 'error',
  'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
  'jsx-a11y/aria-props': 'error',
  'jsx-a11y/aria-proptypes': 'error',
  'jsx-a11y/aria-role': 'error',
  'jsx-a11y/aria-unsupported-elements': 'error',
  'jsx-a11y/autocomplete-valid': 'error',
  'jsx-a11y/click-events-have-key-events': 'error',
  'jsx-a11y/control-has-associated-label': [
    'off',
    {
      ignoreElements: [
        'audio',
        'canvas',
        'embed',
        'input',
        'textarea',
        'tr',
        'video',
      ],
      ignoreRoles: [
        'grid',
        'listbox',
        'menu',
        'menubar',
        'radiogroup',
        'row',
        'tablist',
        'toolbar',
        'tree',
        'treegrid',
      ],
      includeRoles: ['alert', 'dialog'],
    },
  ],
  'jsx-a11y/heading-has-content': 'error',
  'jsx-a11y/html-has-lang': 'error',
  'jsx-a11y/iframe-has-title': 'error',
  'jsx-a11y/img-redundant-alt': 'error',
  'jsx-a11y/interactive-supports-focus': [
    'error',
    {
      tabbable: [
        'button',
        'checkbox',
        'link',
        'progressbar',
        'searchbox',
        'slider',
        'spinbutton',
        'switch',
        'textbox',
      ],
    },
  ],
  'jsx-a11y/label-has-for': 'off',
  'jsx-a11y/label-has-associated-control': 'error',
  'jsx-a11y/media-has-caption': 'error',
  'jsx-a11y/mouse-events-have-key-events': 'error',
  'jsx-a11y/no-access-key': 'error',
  'jsx-a11y/no-autofocus': 'error',
  'jsx-a11y/no-distracting-elements': 'error',
  'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
  'jsx-a11y/no-noninteractive-element-interactions': [
    'error',
    {
      body: ['onError', 'onLoad'],
      iframe: ['onError', 'onLoad'],
      img: ['onError', 'onLoad'],
    },
  ],
  'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
  'jsx-a11y/no-noninteractive-tabindex': 'error',
  'jsx-a11y/no-redundant-roles': 'error',
  'jsx-a11y/no-static-element-interactions': 'error',
  'jsx-a11y/role-has-required-aria-props': 'error',
  'jsx-a11y/role-supports-aria-props': 'error',
  'jsx-a11y/scope': 'error',
  'jsx-a11y/tabindex-no-positive': 'error',
};
/* ---- end copy ---- */

/**
 * Rules in both upstream presets that this plugin does not register, so an entry
 * naming them cannot load. The test below pins the list so the gap is stated
 * rather than discovered. `aria-proptypes` is a live upstream rule (phase 2);
 * `label-has-for` is deprecated upstream and set to `off` there, and gets a
 * no-op stub in a follow-up.
 */
const NOT_IMPLEMENTED = ['jsx-a11y/aria-proptypes', 'jsx-a11y/label-has-for'];

type Preset = Record<string, unknown>;

const PRESETS: ReadonlyArray<readonly [string, Preset]> = [
  ['recommendedRules', recommendedRules],
  ['strictRules', strictRules],
];

/** Every upstream entry that carries options: `[severity, options]`. */
const OPTIONED = PRESETS.flatMap(([preset, rules]) =>
  Object.entries(rules)
    .filter(([, value]) => Array.isArray(value))
    .map(([ruleId, value]) => [preset, ruleId, value] as const),
);

/**
 * Throws, like ESLint does on a bad config, when the config does not load.
 *
 * ESLint validates a rule's options only when the rule is on, and upstream sets
 * `control-has-associated-label` to `off` in both presets. So the severity is
 * forced to `error`: an `off` entry would pass whatever the schema says.
 */
function load(rules: Record<string, unknown>): void {
  const on = Object.fromEntries(
    Object.entries(rules).map(([ruleId, value]) => [
      ruleId,
      Array.isArray(value) ? ['error', ...value.slice(1)] : 'error',
    ]),
  );
  new Linter().verify(
    'const a = <div />;',
    [
      {
        files: ['**/*.jsx'],
        languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { 'jsx-a11y': plugin },
        rules: on as never,
      },
    ],
    { filename: 'a.jsx' },
  );
}

describe('upstream jsx-a11y presets load under the jsx-a11y plugin key', () => {
  it.each(OPTIONED)('%s: %s with its options', (_preset, ruleId, value) => {
    expect(() => load({ [ruleId]: value })).not.toThrow();
  });

  it('covers the entries that used to throw', () => {
    const ids = new Set(OPTIONED.map(([, ruleId]) => ruleId));
    for (const id of [
      'jsx-a11y/control-has-associated-label',
      'jsx-a11y/no-noninteractive-element-interactions',
      'jsx-a11y/no-static-element-interactions',
    ]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it.each(PRESETS)(
    '%s: every entry loads except the unregistered rules',
    (_name, rules) => {
      const failing = Object.entries(rules)
        .filter(([ruleId, value]) => {
          try {
            load({ [ruleId]: value });
            return false;
          } catch {
            return true;
          }
        })
        .map(([ruleId]) => ruleId);
      expect(failing).toEqual(NOT_IMPLEMENTED);
    },
  );

  it('rejects an option object that upstream also rejects', () => {
    // The schemas are loosened, not removed: a wrong type still throws.
    expect(() =>
      load({
        'jsx-a11y/control-has-associated-label': ['error', { depth: -1 }],
      }),
    ).toThrow();
    expect(() =>
      load({
        'jsx-a11y/mouse-events-have-key-events': [
          'error',
          { hoverInHandlers: 'onMouseOver' },
        ],
      }),
    ).toThrow();
  });
});
