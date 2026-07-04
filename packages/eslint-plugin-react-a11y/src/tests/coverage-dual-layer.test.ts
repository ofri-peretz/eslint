/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Dual-layer coverage-hardening tests.
 *
 * Layer 1 — RuleTester fixtures through the real parser: member-expression
 * elements (`<Foo.Bar />`), namespaced attributes (`<div ns:x />`), spread
 * attributes, fragment children, dynamic expressions, and every rule option
 * combination that earlier suites left unexercised.
 *
 * Layer 2 — raw unit tests via `createWithMockContext` from
 * `@interlace/eslint-devkit`: rule.create() invoked with `options: [null]`
 * (reaches the `options ?? {}` / `options || {}` fallbacks that RuleTester's
 * schema validation makes unreachable) and listeners invoked with synthetic
 * AST nodes the parser can never produce (parent: null, non-string Literal
 * attribute values, boolean-true Literals).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import type { RuleLike } from '@interlace/eslint-devkit';

import { plugin as mainPlugin } from '../index';
import { altText, getAltInsertionAnchor } from '../rules/alt-text';
import { anchorAmbiguousText } from '../rules/anchor-ambiguous-text';
import { anchorHasContent } from '../rules/anchor-has-content';
import { anchorIsValid } from '../rules/anchor-is-valid';
import { ariaActivedescendantHasTabindex } from '../rules/aria-activedescendant-has-tabindex';
import { ariaProps } from '../rules/aria-props';
import { ariaRole } from '../rules/aria-role';
import { ariaUnsupportedElements } from '../rules/aria-unsupported-elements';
import { autocompleteValid } from '../rules/autocomplete-valid';
import { clickEventsHaveKeyEvents } from '../rules/click-events-have-key-events';
import { controlHasAssociatedLabel } from '../rules/control-has-associated-label';
import { headingHasContent } from '../rules/heading-has-content';
import { imgRedundantAlt } from '../rules/img-redundant-alt';
import { interactiveSupportsFocus } from '../rules/interactive-supports-focus';
import { labelHasAssociatedControl } from '../rules/label-has-associated-control';
import { mediaHasCaption } from '../rules/media-has-caption';
import { noAriaHiddenOnFocusable } from '../rules/no-aria-hidden-on-focusable';
import { noAutofocus } from '../rules/no-autofocus';
import { noDistractingElements } from '../rules/no-distracting-elements';
import { noInteractiveElementToNoninteractiveRole } from '../rules/no-interactive-element-to-noninteractive-role';
import { noKeyboardInaccessibleElements } from '../rules/no-keyboard-inaccessible-elements';
import { noMissingAriaLabels } from '../rules/no-missing-aria-labels';
import { noNoninteractiveElementInteractions } from '../rules/no-noninteractive-element-interactions';
import { noNoninteractiveElementToInteractiveRole } from '../rules/no-noninteractive-element-to-interactive-role';
import {
  noNoninteractiveTabindex,
  isAllowedTabindex,
  isLiteralRole,
  getRoleValue,
} from '../rules/no-noninteractive-tabindex';
import { noRedundantRoles } from '../rules/no-redundant-roles';
import { noStaticElementInteractions } from '../rules/no-static-element-interactions';
import { preferTagOverRole } from '../rules/prefer-tag-over-role';
import { roleSupportsAriaProps } from '../rules/role-supports-aria-props';
import { scope } from '../rules/scope';
import { tabindexNoPositive } from '../rules/tabindex-no-positive';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

/* ------------------------------------------------------------------ */
/* Synthetic AST helpers (Layer 2)                                     */
/* ------------------------------------------------------------------ */

type AnyNode = Record<string, unknown>;

const jsxId = (name: string): AnyNode => ({ type: 'JSXIdentifier', name });
const literal = (value: unknown): AnyNode => ({ type: 'Literal', value });
const jsxAttr = (name: string, value: AnyNode | null = null): AnyNode => ({
  type: 'JSXAttribute',
  name: jsxId(name),
  value,
});
const openingEl = (
  name: string,
  attributes: AnyNode[] = [],
  parent: AnyNode | null = null,
): AnyNode => ({
  type: 'JSXOpeningElement',
  name: jsxId(name),
  attributes,
  parent,
});
const jsxText = (value: string): AnyNode => ({ type: 'JSXText', value });
const jsxEl = (
  name: string,
  attributes: AnyNode[] = [],
  children: AnyNode[] = [],
): AnyNode => {
  const el: AnyNode = { type: 'JSXElement', children };
  el.openingElement = openingEl(name, attributes, el);
  return el;
};

const asRule = (rule: unknown): RuleLike => rule as RuleLike;

type Listener = (node: unknown) => void;
const listener = (listeners: Record<string, unknown>, name: string): Listener =>
  listeners[name] as Listener;
const messageIdOf = (report: unknown): string =>
  (report as { messageId: string }).messageId;

/* ------------------------------------------------------------------ */
/* oxlint sub-export (src/oxlint.ts)                                   */
/* ------------------------------------------------------------------ */

describe('eslint-plugin-react-a11y/oxlint sub-export', () => {
  it('declares the ./oxlint sub-export in package.json', () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf8'),
    );
    expect(pkgJson.exports['./oxlint']).toEqual({
      types: './src/oxlint.d.ts',
      default: './src/oxlint.js',
    });
  });

  it('re-exports the plugin object (meta + rules at top level)', async () => {
    const oxlintModule = await import('../oxlint.js');
    const oxlintPlugin = (oxlintModule as unknown as { default: typeof mainPlugin }).default;
    expect(oxlintPlugin).toBeDefined();
    expect(oxlintPlugin.meta?.name).toBe('eslint-plugin-react-a11y');
    expect(oxlintPlugin.rules).toBeDefined();
  });

  it('exposes the same rule references as the main entry (pass-through, not a copy)', async () => {
    const oxlintModule = await import('../oxlint.js');
    const oxlintPlugin = (oxlintModule as unknown as { default: typeof mainPlugin }).default;
    expect(Object.keys(oxlintPlugin.rules || {}).toSorted()).toEqual(
      Object.keys(mainPlugin.rules || {}).toSorted(),
    );
    for (const ruleName of Object.keys(mainPlugin.rules || {})) {
      expect(oxlintPlugin.rules?.[ruleName]).toBe(
        (mainPlugin.rules as Record<string, unknown>)[ruleName],
      );
    }
  });
});

/* ------------------------------------------------------------------ */
/* Layer 1 — alt-text: object / area / input[type=image] / options     */
/* ------------------------------------------------------------------ */

describe('alt-text — element kinds and custom components (Layer 1)', () => {
  ruleTester.run('alt-text object-area-input coverage', altText, {
    valid: [
      // Member-expression element name → classify() returns null
      { code: '<Foo.Bar src="x" />' },
      // <object> with a text alternative
      { code: '<object aria-label="Interactive chart" />' },
      { code: '<object aria-labelledby="chart-title" />' },
      { code: '<object title="Video player" />' },
      { code: '<object title={dynamicTitle} />' },
      { code: '<object>Fallback description</object>' },
      { code: '<object>{fallbackContent}</object>' },
      { code: '<object><param name="movie" value="movie.swf" /></object>' },
      // <area> with alternatives
      { code: '<area alt="Northern region" href="#north" />' },
      { code: '<area alt="" />' },
      { code: '<area alt={dynamicAlt} />' },
      { code: '<area aria-label="Zone" />' },
      { code: '<area aria-labelledby="zone-label" />' },
      // <input type="image"> with alternatives
      { code: '<input type="image" alt="Submit order" />' },
      { code: '<input type="image" alt="" />' },
      { code: '<input type="image" alt={dynamicAlt} />' },
      { code: '<input type="image" aria-label="Search" />' },
      { code: '<input type="image" aria-labelledby="search-label" />' },
      // non-image inputs are never checked
      { code: '<input type="text" />' },
      { code: '<input />' },
      { code: '<input type={dynamicType} />' },
      // dynamic aria attributes count as "has a value"
      {
        code: '<img aria-label={computedLabel} />',
        options: [{ allowAriaLabel: true }],
      },
      {
        code: '<img aria-labelledby={computedId} />',
        options: [{ allowAriaLabelledby: true }],
      },
      // empty aria-label falls through to a non-empty aria-labelledby
      {
        code: '<img aria-label="" aria-labelledby="cap" />',
        options: [{ allowAriaLabel: true, allowAriaLabelledby: true }],
      },
      { code: '<object aria-label="" aria-labelledby="cap" />' },
    ],
    invalid: [
      // no attributes at all → suggestion inserts after the element name
      {
        code: '<img />',
        errors: [
          {
            messageId: 'missingAlt',
            suggestions: [
              { messageId: 'addDescriptiveAlt', output: '<img alt="TODO: Add descriptive text" />' },
              { messageId: 'useEmptyAlt', output: '<img alt="" />' },
            ],
          },
        ],
      },
      // role="presentation"/"none" → prefer alt="" (autofix)
      {
        code: '<img role="presentation" />',
        output: '<img role="presentation" alt="" />',
        errors: [{ messageId: 'preferEmptyAltOverPresentation' }],
      },
      {
        code: '<img role="none" className="decor" />',
        output: '<img role="none" className="decor" alt="" />',
        errors: [{ messageId: 'preferEmptyAltOverPresentation' }],
      },
      // non-presentation role values still require alt
      {
        code: '<img role="banner" />',
        errors: [
          {
            messageId: 'missingAlt',
            suggestions: [
              { messageId: 'addDescriptiveAlt', output: '<img role="banner" alt="TODO: Add descriptive text" />' },
              { messageId: 'useEmptyAlt', output: '<img role="banner" alt="" />' },
            ],
          },
        ],
      },
      {
        code: '<img role={dynamicRole} />',
        errors: [
          {
            messageId: 'missingAlt',
            suggestions: [
              { messageId: 'addDescriptiveAlt', output: '<img role={dynamicRole} alt="TODO: Add descriptive text" />' },
              { messageId: 'useEmptyAlt', output: '<img role={dynamicRole} alt="" />' },
            ],
          },
        ],
      },
      {
        code: '<img role />',
        errors: [
          {
            messageId: 'missingAlt',
            suggestions: [
              { messageId: 'addDescriptiveAlt', output: '<img role alt="TODO: Add descriptive text" />' },
              { messageId: 'useEmptyAlt', output: '<img role alt="" />' },
            ],
          },
        ],
      },
      // <object> without any alternative
      {
        code: '<object></object>',
        errors: [{ messageId: 'objectMissingAlternative' }],
      },
      {
        code: '<object data="movie.swf" />',
        errors: [{ messageId: 'objectMissingAlternative' }],
      },
      {
        code: '<object>{}</object>',
        errors: [{ messageId: 'objectMissingAlternative' }],
      },
      {
        code: '<object><></></object>',
        errors: [{ messageId: 'objectMissingAlternative' }],
      },
      {
        code: '<object title="" />',
        errors: [{ messageId: 'objectMissingAlternative' }],
      },
      // <area> without any alternative
      {
        code: '<area />',
        errors: [{ messageId: 'areaMissingAlternative' }],
      },
      {
        code: '<area href="#main" />',
        errors: [{ messageId: 'areaMissingAlternative' }],
      },
      // <input type="image"> without any alternative
      {
        code: '<input type="image" name="go" />',
        errors: [{ messageId: 'inputImageMissingAlternative' }],
      },
      // custom component mapping via options
      {
        code: '<Image src="x" />',
        options: [{ img: ['Image'] }],
        errors: [
          {
            messageId: 'missingAlt',
            suggestions: [
              {
                messageId: 'addDescriptiveAlt',
                output: '<Image src="x" alt="TODO: Add descriptive text" />',
              },
              { messageId: 'useEmptyAlt', output: '<Image src="x" alt="" />' },
            ],
          },
        ],
      },
      {
        code: '<Embed />',
        options: [{ object: ['Embed'] }],
        errors: [{ messageId: 'objectMissingAlternative' }],
      },
      {
        code: '<Hotspot />',
        options: [{ area: ['Hotspot'] }],
        errors: [{ messageId: 'areaMissingAlternative' }],
      },
      {
        code: '<ImageButton type="image" />',
        options: [{ inputImage: ['ImageButton'] }],
        errors: [{ messageId: 'inputImageMissingAlternative' }],
      },
      // opt-in aria alternatives only accept the attribute that was opted into
      {
        code: '<img aria-labelledby="cap" />',
        options: [{ allowAriaLabel: true }],
        errors: [
          {
            messageId: 'missingAlt',
            suggestions: [
              { messageId: 'addDescriptiveAlt', output: '<img aria-labelledby="cap" alt="TODO: Add descriptive text" />' },
              { messageId: 'useEmptyAlt', output: '<img aria-labelledby="cap" alt="" />' },
            ],
          },
        ],
      },
      {
        code: '<img aria-label="cap" />',
        options: [{ allowAriaLabelledby: true }],
        errors: [
          {
            messageId: 'missingAlt',
            suggestions: [
              { messageId: 'addDescriptiveAlt', output: '<img aria-label="cap" alt="TODO: Add descriptive text" />' },
              { messageId: 'useEmptyAlt', output: '<img aria-label="cap" alt="" />' },
            ],
          },
        ],
      },
      // empty aria-label alone is not an alternative
      {
        code: '<object aria-label="" />',
        errors: [{ messageId: 'objectMissingAlternative' }],
      },
    ],
  });

  it('getAltInsertionAnchor returns the last attribute, or the element name when empty', () => {
    const attrA = jsxAttr('src', literal('x'));
    const attrB = jsxAttr('id', literal('y'));
    const withAttrs = openingEl('img', [attrA, attrB]);
    expect(getAltInsertionAnchor(withAttrs as never)).toBe(attrB);
    const bare = openingEl('img', []);
    expect(getAltInsertionAnchor(bare as never)).toBe(bare.name);
  });
});

/* ------------------------------------------------------------------ */
/* Layer 1 — the remaining rules                                       */
/* ------------------------------------------------------------------ */

describe('anchor-ambiguous-text — img children and fragments (Layer 1)', () => {
  ruleTester.run('anchor-ambiguous-text child extraction', anchorAmbiguousText, {
    valid: [
      // img child without a usable alt contributes no text
      { code: '<a href="/docs"><img alt={dynamicAlt} /></a>' },
      // fragment children are skipped by extractTextFromChildren
      { code: '<a href="/docs"><>Read the documentation</></a>' },
    ],
    invalid: [
      // img child without alt + ambiguous trailing text
      {
        code: '<a href="/docs"><img /> click here</a>',
        errors: [{ messageId: 'ambiguousText' }],
      },
    ],
  });
});

describe('anchor-has-content — guards (Layer 1)', () => {
  ruleTester.run('anchor-has-content guards', anchorHasContent, {
    valid: [{ code: '<Foo.Bar />' }],
    invalid: [
      // spread / namespaced attributes are not treated as content
      { code: '<a {...props} />', errors: [{ messageId: 'missingContent' }] },
      { code: '<a ns:x="1" />', errors: [{ messageId: 'missingContent' }] },
    ],
  });
});

describe('anchor-is-valid — dynamic href (Layer 1)', () => {
  ruleTester.run('anchor-is-valid dynamic href', anchorIsValid, {
    valid: [{ code: '<a href={dynamicUrl}>Docs</a>' }],
    invalid: [],
  });
});

describe('aria-activedescendant-has-tabindex — guards (Layer 1)', () => {
  ruleTester.run('aria-activedescendant guards', ariaActivedescendantHasTabindex, {
    valid: [{ code: '<Foo.Bar aria-activedescendant="opt-1" />' }],
    invalid: [],
  });
});

describe('aria-props — namespaced attributes (Layer 1)', () => {
  ruleTester.run('aria-props namespaced attributes', ariaProps, {
    valid: [{ code: '<div ns:attr="x" />' }],
    invalid: [],
  });
});

describe('aria-role — non-role attributes (Layer 1)', () => {
  ruleTester.run('aria-role non-role attributes', ariaRole, {
    valid: [{ code: '<div className="btn" role="alert" />' }],
    invalid: [],
  });
});

describe('aria-unsupported-elements — guards (Layer 1)', () => {
  ruleTester.run('aria-unsupported-elements guards', ariaUnsupportedElements, {
    valid: [{ code: '<Foo.Bar aria-label="x" />' }],
    invalid: [],
  });
});

describe('autocomplete-valid — guards and section- prefix (Layer 1)', () => {
  ruleTester.run('autocomplete-valid guards', autocompleteValid, {
    valid: [
      { code: '<Foo.Bar autocomplete="bogus" />' },
      { code: '<div autocomplete="bogus" />' },
      // section-* prefix is stripped before validation
      { code: '<input autocomplete="section-email" />' },
    ],
    invalid: [],
  });
});

describe('click-events-have-key-events — element and role guards (Layer 1)', () => {
  ruleTester.run('click-events guards', clickEventsHaveKeyEvents, {
    valid: [],
    invalid: [
      // member-expression element: tagName is null → not native-interactive
      {
        code: '<Foo.Bar onClick={handleClick} />',
        errors: [{ messageId: 'missingKeyboardEvent' }],
      },
      // dynamic role value can't be verified → still requires keyboard events
      {
        code: '<div onClick={handleClick} role={dynamicRole} />',
        errors: [{ messageId: 'missingKeyboardEvent' }],
      },
      // non-interactive literal role → still requires keyboard events
      {
        code: '<div onClick={handleClick} role="tooltip" />',
        errors: [{ messageId: 'missingKeyboardEvent' }],
      },
    ],
  });
});

describe('control-has-associated-label — nested img and options (Layer 1)', () => {
  ruleTester.run('control-has-associated-label nested content', controlHasAssociatedLabel, {
    valid: [
      { code: '<Foo.Bar />' },
      // nested img with alt labels the control
      { code: '<button><img alt="Save icon" /></button>' },
      { code: '<button><img {...iconProps} src="save.svg" alt="Save" /></button>' },
      // input type="image" with alt
      { code: '<input type="image" alt="Submit" />' },
      // custom label attribute
      {
        code: '<button data-label="Save"></button>',
        options: [{ labelAttributes: ['data-label'] }],
      },
    ],
    invalid: [
      // nested img without alt does not label the control
      { code: '<button><img /></button>', errors: [{ messageId: 'missingLabel' }] },
      // fragment children carry no text
      { code: '<button><></></button>', errors: [{ messageId: 'missingLabel' }] },
      // member-expression child without aria attributes carries no text either
      { code: '<button><Icon.Save /></button>', errors: [{ messageId: 'missingLabel' }] },
      // input type="image" without alt
      { code: '<input type="image" />', errors: [{ messageId: 'missingLabel' }] },
      // configured label attribute missing
      {
        code: '<button></button>',
        options: [{ labelAttributes: ['data-label'] }],
        errors: [{ messageId: 'missingLabel' }],
      },
    ],
  });
});

describe('heading-has-content — non-content attributes (Layer 1)', () => {
  ruleTester.run('heading-has-content guards', headingHasContent, {
    valid: [],
    invalid: [
      { code: '<h1 {...props} />', errors: [{ messageId: 'missingContent' }] },
      { code: '<h2 ns:x="y" />', errors: [{ messageId: 'missingContent' }] },
    ],
  });
});

describe('img-redundant-alt — guards (Layer 1)', () => {
  ruleTester.run('img-redundant-alt guards', imgRedundantAlt, {
    valid: [{ code: '<Foo.Bar alt="photo of sunset" />' }],
    invalid: [],
  });
});

describe('interactive-supports-focus — roles and tabIndex (Layer 1)', () => {
  ruleTester.run('interactive-supports-focus roles', interactiveSupportsFocus, {
    valid: [
      { code: '<Foo.Bar onClick={handleClick} />' },
      // tabIndex present → focusable
      { code: '<div onClick={handleClick} tabIndex={0} />' },
    ],
    invalid: [
      // dynamic role value can't be verified
      {
        code: '<div onClick={handleClick} role={dynamicRole} />',
        errors: [{ messageId: 'missingTabIndex' }],
      },
      // literal but non-interactive role
      {
        code: '<div onClick={handleClick} role="tooltip" />',
        errors: [{ messageId: 'missingTabIndex' }],
      },
    ],
  });
});

describe('label-has-associated-control — assert modes and attributes (Layer 1)', () => {
  ruleTester.run('label-has-associated-control assert modes', labelHasAssociatedControl, {
    valid: [
      // aria-label on the label itself
      { code: '<label aria-label="Name"></label>' },
      // custom label attribute acts like htmlFor
      {
        code: '<label data-for="name-input">Name</label>',
        options: [{ labelAttributes: ['data-for'] }],
      },
      { code: '<label htmlFor="a">Name</label>', options: [{ assert: 'htmlFor' }] },
      { code: '<label><input /></label>', options: [{ assert: 'nesting' }] },
      {
        code: '<label htmlFor="a"><input id="a" /></label>',
        options: [{ assert: 'both' }],
      },
    ],
    invalid: [
      // boolean-shorthand aria-label has no value → not an accessible name
      {
        code: '<label aria-label></label>',
        errors: [{ messageId: 'missingControl' }],
      },
      // nesting alone fails assert: 'htmlFor'
      {
        code: '<label><input /></label>',
        options: [{ assert: 'htmlFor' }],
        errors: [{ messageId: 'missingControl' }],
      },
      // htmlFor alone fails assert: 'both'
      {
        code: '<label htmlFor="a">Name</label>',
        options: [{ assert: 'both' }],
        errors: [{ messageId: 'missingControl' }],
      },
      // control nested deeper than `depth` is not found
      {
        code: '<label><div><div><div><input /></div></div></div></label>',
        errors: [{ messageId: 'missingControl' }],
      },
    ],
  });
});

describe('media-has-caption — children shapes (Layer 1)', () => {
  ruleTester.run('media-has-caption children', mediaHasCaption, {
    valid: [
      { code: '<Foo.Bar></Foo.Bar>' },
      // descriptions tracks also satisfy the rule
      { code: '<video><track kind="descriptions" /></video>' },
    ],
    invalid: [
      // text children are not tracks
      { code: '<video>loading…</video>', errors: [{ messageId: 'missingCaption' }] },
      // non-track element children don't count
      {
        code: '<video><source src="movie.mp4" /></video>',
        errors: [{ messageId: 'missingCaption' }],
      },
    ],
  });
});

describe('no-aria-hidden-on-focusable — tabIndex values (Layer 1)', () => {
  ruleTester.run('no-aria-hidden-on-focusable tabIndex', noAriaHiddenOnFocusable, {
    valid: [
      { code: '<Foo.Bar aria-hidden="true" />' },
      // negative tabIndex keeps the element out of the tab order
      { code: '<div aria-hidden="true" tabIndex="-1" />' },
      // non-numeric tabIndex can't make it focusable
      { code: '<div aria-hidden="true" tabIndex="abc" />' },
    ],
    invalid: [
      {
        code: '<div aria-hidden="true" tabIndex="0" />',
        errors: [{ messageId: 'ariaHiddenFocusable' }],
      },
    ],
  });
});

describe('no-autofocus — other attributes (Layer 1)', () => {
  ruleTester.run('no-autofocus other attributes', noAutofocus, {
    valid: [{ code: '<input type="text" />' }],
    invalid: [],
  });
});

describe('no-interactive-element-to-noninteractive-role — exceptions (Layer 1)', () => {
  ruleTester.run('interactive-to-noninteractive exceptions', noInteractiveElementToNoninteractiveRole, {
    valid: [
      { code: '<Foo.Bar role="img" />' },
      // custom per-element exception permits the role
      {
        code: '<a href="/x" role="presentation">x</a>',
        options: [{ a: ['presentation'] }],
      },
    ],
    invalid: [],
  });
});

describe('no-keyboard-inaccessible-elements — guards (Layer 1)', () => {
  ruleTester.run('no-keyboard-inaccessible guards', noKeyboardInaccessibleElements, {
    valid: [{ code: '<Foo.Bar onClick={handleClick} />' }],
    invalid: [],
  });
});

describe('no-missing-aria-labels — guards (Layer 1)', () => {
  ruleTester.run('no-missing-aria-labels guards', noMissingAriaLabels, {
    valid: [{ code: '<Foo.Bar />' }],
    invalid: [],
  });
});

describe('no-noninteractive-element-interactions — roles (Layer 1)', () => {
  ruleTester.run('noninteractive-element-interactions roles', noNoninteractiveElementInteractions, {
    valid: [
      { code: '<Foo.Bar onClick={handleClick} />' },
      // interactive ARIA role exempts the element
      { code: '<li onClick={handleClick} role="menuitem" />' },
    ],
    invalid: [
      // dynamic role can't be verified
      {
        code: '<li onClick={handleClick} role={dynamicRole} />',
        errors: [{ messageId: 'noInteraction' }],
      },
      // non-interactive role does not exempt
      {
        code: '<li onClick={handleClick} role="presentation" />',
        errors: [{ messageId: 'noInteraction' }],
      },
    ],
  });
});

describe('no-noninteractive-element-to-interactive-role — guards (Layer 1)', () => {
  ruleTester.run('noninteractive-to-interactive guards', noNoninteractiveElementToInteractiveRole, {
    valid: [{ code: '<Foo.Bar role="button" />' }],
    invalid: [],
  });
});

describe('no-noninteractive-tabindex — expression roles (Layer 1)', () => {
  ruleTester.run('no-noninteractive-tabindex expression roles', noNoninteractiveTabindex, {
    valid: [{ code: '<Foo.Bar tabIndex="0" />' }],
    invalid: [
      // allowExpressionValues: false → dynamic role is not a valid role
      {
        code: '<div role={dynamicRole} tabIndex="0" />',
        options: [{ allowExpressionValues: false }],
        errors: [{ messageId: 'noNoninteractiveTabindex' }],
      },
    ],
  });
});

describe('no-redundant-roles — exceptions (Layer 1)', () => {
  ruleTester.run('no-redundant-roles exceptions', noRedundantRoles, {
    valid: [
      { code: '<Foo.Bar role="img" />' },
      // default exceptions allow these redundant-looking pairs
      { code: '<nav role="navigation"></nav>' },
      // explicit role that differs from the implicit one
      { code: '<img role="presentation" alt="" />' },
    ],
    invalid: [],
  });
});

describe('no-static-element-interactions — guards (Layer 1)', () => {
  ruleTester.run('no-static-element-interactions guards', noStaticElementInteractions, {
    valid: [{ code: '<Foo.Bar onClick={handleClick} />' }],
    invalid: [],
  });
});

describe('prefer-tag-over-role — input types (Layer 1)', () => {
  ruleTester.run('prefer-tag-over-role input types', preferTagOverRole, {
    valid: [
      { code: '<Foo.Bar role="banner" />' },
      // element already matches the preferred tag
      { code: '<header role="banner">x</header>' },
      // input with matching type attribute
      { code: '<input type="checkbox" role="checkbox" />' },
    ],
    invalid: [
      // no type attribute at all
      {
        code: '<div role="checkbox" />',
        errors: [{ messageId: 'preferTagOverRole' }],
      },
      // matching type attribute but wrong element
      {
        code: '<span type="radio" role="radio" />',
        errors: [{ messageId: 'preferTagOverRole' }],
      },
      // dynamic type attribute can't match
      {
        code: '<div role="searchbox" type={dynamicType} />',
        errors: [{ messageId: 'preferTagOverRole' }],
      },
    ],
  });
});

describe('role-supports-aria-props — guards (Layer 1)', () => {
  ruleTester.run('role-supports-aria-props guards', roleSupportsAriaProps, {
    valid: [
      { code: '<Foo.Bar aria-checked="true" />' },
      // spread + namespaced attributes are skipped inside the attribute loop
      { code: '<div role="checkbox" {...props} ns:x="y" aria-checked="true" />' },
    ],
    invalid: [],
  });
});

describe('scope — other attributes (Layer 1)', () => {
  ruleTester.run('scope other attributes', scope, {
    valid: [{ code: '<th scope="col" id="header-1" />' }],
    invalid: [],
  });
});

describe('tabindex-no-positive — guards (Layer 1)', () => {
  ruleTester.run('tabindex-no-positive guards', tabindexNoPositive, {
    valid: [
      { code: '<div id="x" />' },
      // boolean-shorthand tabIndex has no value to check
      { code: '<div tabIndex />' },
    ],
    invalid: [],
  });
});

/* ------------------------------------------------------------------ */
/* Layer 2 — options: [null] reaches the `options ?? {}` fallbacks     */
/* ------------------------------------------------------------------ */

describe('Layer 2 — null options fall back to defaults', () => {
  it('anchor-ambiguous-text uses the default ambiguous-word list', () => {
    const { listeners, reports } = createWithMockContext(asRule(anchorAmbiguousText), {
      options: [null],
    });
    listener(listeners, 'JSXElement')(jsxEl('a', [], [jsxText('click here')]));
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('ambiguousText');
  });

  it('anchor-has-content still reports an empty anchor', () => {
    const { listeners, reports } = createWithMockContext(asRule(anchorHasContent), {
      options: [null],
    });
    listener(listeners, 'JSXElement')(jsxEl('a'));
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('missingContent');
  });

  it('anchor-is-valid still reports a missing href', () => {
    const { listeners, reports } = createWithMockContext(asRule(anchorIsValid), {
      options: [null],
    });
    listener(listeners, 'JSXOpeningElement')(openingEl('a'));
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('noHref');
  });

  it('aria-role still reports an invalid role', () => {
    const { listeners, reports } = createWithMockContext(asRule(ariaRole), {
      options: [null],
    });
    listener(listeners, 'JSXAttribute')(jsxAttr('role', literal('bogus-role')));
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('invalidRole');
  });

  it('autocomplete-valid still reports an invalid token', () => {
    const { listeners, reports } = createWithMockContext(asRule(autocompleteValid), {
      options: [null],
    });
    listener(listeners, 'JSXOpeningElement')(
      openingEl('input', [jsxAttr('autocomplete', literal('bogus'))]),
    );
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('invalidAutocomplete');
  });

  it('control-has-associated-label still reports an unlabelled control', () => {
    const { listeners, reports } = createWithMockContext(asRule(controlHasAssociatedLabel), {
      options: [null],
    });
    listener(listeners, 'JSXElement')(jsxEl('button'));
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('missingLabel');
  });

  it('heading-has-content still reports an empty heading', () => {
    const { listeners, reports } = createWithMockContext(asRule(headingHasContent), {
      options: [null],
    });
    listener(listeners, 'JSXElement')(jsxEl('h1'));
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('missingContent');
  });

  it('img-redundant-alt uses the default redundant-word list', () => {
    const { listeners, reports } = createWithMockContext(asRule(imgRedundantAlt), {
      options: [null],
    });
    listener(listeners, 'JSXOpeningElement')(
      openingEl('img', [jsxAttr('alt', literal('photo of a dog'))]),
    );
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('redundantAlt');
  });

  it('interactive-supports-focus still reports a missing tabIndex', () => {
    const { listeners, reports } = createWithMockContext(asRule(interactiveSupportsFocus), {
      options: [null],
    });
    listener(listeners, 'JSXOpeningElement')(openingEl('div', [jsxAttr('onClick')]));
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('missingTabIndex');
  });

  it('label-has-associated-control still reports an unassociated label', () => {
    const { listeners, reports } = createWithMockContext(asRule(labelHasAssociatedControl), {
      options: [null],
    });
    listener(listeners, 'JSXElement')(jsxEl('label'));
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('missingControl');
  });

  it('media-has-caption still reports a caption-less video', () => {
    const { listeners, reports } = createWithMockContext(asRule(mediaHasCaption), {
      options: [null],
    });
    listener(listeners, 'JSXElement')(jsxEl('video'));
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('missingCaption');
  });

  it('no-distracting-elements uses the default element list', () => {
    const { listeners, reports } = createWithMockContext(asRule(noDistractingElements), {
      options: [null],
    });
    listener(listeners, 'JSXOpeningElement')(openingEl('marquee'));
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('noDistractingElements');
  });

  it('no-keyboard-inaccessible-elements uses the default element list', () => {
    const { listeners, reports } = createWithMockContext(asRule(noKeyboardInaccessibleElements), {
      options: [null],
    });
    listener(listeners, 'JSXOpeningElement')(openingEl('div', [jsxAttr('onClick')]));
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('keyboardInaccessible');
  });

  it('no-missing-aria-labels uses the default element list', () => {
    const { listeners, reports } = createWithMockContext(asRule(noMissingAriaLabels), {
      options: [null],
    });
    listener(listeners, 'JSXOpeningElement')(openingEl('button'));
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('missingAriaLabel');
  });

  it('no-noninteractive-element-interactions uses the default handler list', () => {
    const { listeners, reports } = createWithMockContext(
      asRule(noNoninteractiveElementInteractions),
      { options: [null] },
    );
    listener(listeners, 'JSXOpeningElement')(openingEl('li', [jsxAttr('onClick')]));
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('noInteraction');
  });

  it('no-redundant-roles treats null options as "no exceptions"', () => {
    const { listeners, reports } = createWithMockContext(asRule(noRedundantRoles), {
      options: [null],
    });
    listener(listeners, 'JSXOpeningElement')(
      openingEl('img', [jsxAttr('role', literal('img'))]),
    );
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('redundantRole');
  });

  it('no-static-element-interactions uses the default handler list', () => {
    const { listeners, reports } = createWithMockContext(asRule(noStaticElementInteractions), {
      options: [null],
    });
    listener(listeners, 'JSXOpeningElement')(openingEl('div', [jsxAttr('onClick')]));
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('noStaticInteraction');
  });
});

/* ------------------------------------------------------------------ */
/* Layer 2 — synthetic AST nodes for parser-unreachable branches       */
/* ------------------------------------------------------------------ */

describe('Layer 2 — synthetic AST branches', () => {
  it('alt-text: <object> opening element with no parent reports (hasAccessibleChild bails)', () => {
    const { listeners, reports } = createWithMockContext(asRule(altText));
    listener(listeners, 'JSXOpeningElement')(openingEl('object', [], null));
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('objectMissingAlternative');
  });

  it('alt-text: <object> opening element with a non-JSXElement parent reports', () => {
    const { listeners, reports } = createWithMockContext(asRule(altText));
    listener(listeners, 'JSXOpeningElement')(
      openingEl('object', [], { type: 'ReturnStatement' }),
    );
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('objectMissingAlternative');
  });

  it('alt-text: parent JSXElement without a children array reports', () => {
    const { listeners, reports } = createWithMockContext(asRule(altText));
    listener(listeners, 'JSXOpeningElement')(
      openingEl('object', [], { type: 'JSXElement', children: undefined }),
    );
    expect(reports).toHaveLength(1);
    expect(messageIdOf(reports[0])).toBe('objectMissingAlternative');
  });

  it('alt-text: expression container without an expression counts as content', () => {
    const { listeners, reports } = createWithMockContext(asRule(altText));
    listener(listeners, 'JSXOpeningElement')(
      openingEl('object', [], {
        type: 'JSXElement',
        children: [{ type: 'JSXExpressionContainer', expression: undefined }],
      }),
    );
    expect(reports).toHaveLength(0);
  });

  it('img-redundant-alt: boolean-true aria-hidden Literal skips the image', () => {
    const { listeners, reports } = createWithMockContext(asRule(imgRedundantAlt));
    listener(listeners, 'JSXOpeningElement')(
      openingEl('img', [
        jsxAttr('aria-hidden', literal(true)),
        jsxAttr('alt', literal('photo of a dog')),
      ]),
    );
    expect(reports).toHaveLength(0);
  });

  it('scope: attribute without a parent is ignored', () => {
    const { listeners, reports } = createWithMockContext(asRule(scope));
    listener(listeners, 'JSXAttribute')({
      type: 'JSXAttribute',
      name: jsxId('scope'),
      value: literal('col'),
      parent: null,
    });
    expect(reports).toHaveLength(0);
  });

  it('control-has-associated-label: non-string role Literal is not interactive', () => {
    const { listeners, reports } = createWithMockContext(asRule(controlHasAssociatedLabel));
    listener(listeners, 'JSXElement')(jsxEl('div', [jsxAttr('role', literal(5))]));
    expect(reports).toHaveLength(0);
  });

  it('no-interactive-element-to-noninteractive-role: non-string role Literal is skipped', () => {
    const { listeners, reports } = createWithMockContext(
      asRule(noInteractiveElementToNoninteractiveRole),
    );
    listener(listeners, 'JSXOpeningElement')(
      openingEl('button', [jsxAttr('role', literal(true))]),
    );
    expect(reports).toHaveLength(0);
  });

  it('no-noninteractive-element-to-interactive-role: non-string role Literal is skipped', () => {
    const { listeners, reports } = createWithMockContext(
      asRule(noNoninteractiveElementToInteractiveRole),
    );
    listener(listeners, 'JSXOpeningElement')(
      openingEl('li', [jsxAttr('role', literal(42))]),
    );
    expect(reports).toHaveLength(0);
  });

  it('prefer-tag-over-role: non-string role Literal is skipped', () => {
    const { listeners, reports } = createWithMockContext(asRule(preferTagOverRole));
    listener(listeners, 'JSXOpeningElement')(
      openingEl('div', [jsxAttr('role', literal(true))]),
    );
    expect(reports).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* Layer 2 — no-noninteractive-tabindex helper functions               */
/* ------------------------------------------------------------------ */

describe('Layer 2 — no-noninteractive-tabindex helpers', () => {
  it('isAllowedTabindex accepts -1 and rejects other numbers (numeric input path)', () => {
    expect(isAllowedTabindex(-1)).toBe(true);
    expect(isAllowedTabindex(0)).toBe(false);
    expect(isAllowedTabindex(5)).toBe(false);
  });

  it('isAllowedTabindex parses string values', () => {
    expect(isAllowedTabindex('-1')).toBe(true);
    expect(isAllowedTabindex('0')).toBe(false);
    expect(isAllowedTabindex('abc')).toBe(false);
  });

  it('isLiteralRole rejects missing attributes and non-string Literals', () => {
    expect(isLiteralRole(undefined, true)).toBe(false);
    expect(isLiteralRole(undefined, false)).toBe(false);
    expect(isLiteralRole({ value: null } as never, true)).toBe(false);
    // Literal with a non-string value under strict (no-expression) mode
    expect(isLiteralRole({ value: literal(5) } as never, false)).toBe(false);
    // Literal string under strict mode is accepted
    expect(isLiteralRole({ value: literal('button') } as never, false)).toBe(true);
  });

  it('getRoleValue returns null without a usable attribute and the string otherwise', () => {
    expect(getRoleValue(undefined)).toBeNull();
    expect(getRoleValue({ value: null } as never)).toBeNull();
    expect(getRoleValue({ value: literal(7) } as never)).toBeNull();
    expect(getRoleValue({ value: { type: 'JSXExpressionContainer' } } as never)).toBeNull();
    expect(getRoleValue({ value: literal('tab') } as never)).toBe('tab');
  });
});
