/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: autocomplete-valid
 * Enforce that autocomplete attribute has valid value
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/autocomplete-valid.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'invalidAutocomplete';

type Options = {
  inputComponents?: string[];
};

type RuleOptions = [Options?];

const VALID_AUTOCOMPLETE_VALUES = new Set([
  'on',
  'off',
  'name',
  'honorific-prefix',
  'given-name',
  'additional-name',
  'family-name',
  'honorific-suffix',
  'nickname',
  'email',
  'username',
  'new-password',
  'current-password',
  'organization-title',
  'organization',
  'street-address',
  'address-line1',
  'address-line2',
  'address-line3',
  'address-level4',
  'address-level3',
  'address-level2',
  'address-level1',
  'country',
  'country-name',
  'postal-code',
  'cc-name',
  'cc-given-name',
  'cc-additional-name',
  'cc-family-name',
  'cc-number',
  'cc-exp',
  'cc-exp-month',
  'cc-exp-year',
  'cc-csc',
  'cc-type',
  'transaction-currency',
  'transaction-amount',
  'language',
  'bday',
  'bday-day',
  'bday-month',
  'bday-year',
  'sex',
  'tel',
  'tel-country-code',
  'tel-national',
  'tel-area-code',
  'tel-local',
  'tel-extension',
  'impp',
  'url',
  'photo',
]);

/**
 * The autofill grammar, not just its field names.
 *
 * HTML defines an autocomplete value as an ORDERED sequence:
 *
 *   [section-*] [shipping|billing] [home|work|mobile|fax|pager] field [webauthn]
 *
 * The rule checked every token against the field-name set alone, which was
 * wrong in both directions at once. `autocomplete="shipping street-address"`
 * reported — a false positive on four spec-valid forms — while
 * `autocomplete="name email"` passed, because each token is a legal field name
 * even though only one field name is allowed.
 *
 * These are HTML spec vocabularies, fixed by the standard rather than guessed
 * at, so they belong in the rule rather than behind an option.
 */
const ADDRESS_MODIFIERS: ReadonlySet<string> = new Set(['shipping', 'billing']);
const CONTACT_MODIFIERS: ReadonlySet<string> = new Set([
  'home',
  'work',
  'mobile',
  'fax',
  'pager',
]);
const CREDENTIAL_SUFFIX = 'webauthn';

/** `off` and `on` stand alone: they are not field names in a sequence. */
const STANDALONE: ReadonlySet<string> = new Set(['on', 'off']);

export const autocompleteValid = createRule<RuleOptions, MessageIds>({
  name: 'autocomplete-valid',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/autocomplete-valid.md',
      description: 'Enforce that autocomplete attribute has valid value',
      wcag: 'WCAG 1.3.5',
    },
    messages: {
      invalidAutocomplete: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Invalid Autocomplete',
        description: 'Invalid autocomplete value',
        severity: 'MEDIUM',
        fix: 'Use a valid autocomplete token (e.g., "username", "current-password")',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/autocomplete-valid.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          inputComponents: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {} as Options],
  ) {
    const { inputComponents = [] } = options ?? ({} as Options);
    const inputs = new Set(['input', ...inputComponents]);

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier' || !inputs.has(node.name.name))
          return;

        const autocomplete = node.attributes.find(
          (
            attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute,
          ): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'autocomplete',
        );

        if (
          !autocomplete ||
          autocomplete.type !== 'JSXAttribute' ||
          !autocomplete.value ||
          autocomplete.value.type !== 'Literal' ||
          typeof autocomplete.value.value !== 'string'
        )
          return;

        const value = autocomplete.value.value.trim();
        if (value === '') {
          context.report({
            node: autocomplete,
            messageId: 'invalidAutocomplete',
          });
          return;
        }

        const tokens = value.toLowerCase().split(/\s+/);
        const report = (): void => {
          context.report({
            node: autocomplete,
            messageId: 'invalidAutocomplete',
          });
        };

        // `on` / `off` stand alone.
        if (tokens.some((t) => STANDALONE.has(t))) {
          if (tokens.length !== 1) report();
          return;
        }

        let index = 0;
        // An optional `section-*` label comes first.
        if (tokens[index]?.startsWith('section-')) index += 1;
        // Then at most one address modifier, then at most one contact modifier.
        if (
          index < tokens.length &&
          ADDRESS_MODIFIERS.has(tokens[index] as string)
        )
          index += 1;
        if (
          index < tokens.length &&
          CONTACT_MODIFIERS.has(tokens[index] as string)
        )
          index += 1;

        // Then EXACTLY one field name. Two is the shape this rule used to pass.
        const field = tokens[index];
        if (field === undefined || !VALID_AUTOCOMPLETE_VALUES.has(field)) {
          report();
          return;
        }
        index += 1;

        // Then an optional `webauthn`, and then nothing.
        if (index < tokens.length && tokens[index] === CREDENTIAL_SUFFIX)
          index += 1;
        if (index !== tokens.length) report();
      },
    };
  },
});
