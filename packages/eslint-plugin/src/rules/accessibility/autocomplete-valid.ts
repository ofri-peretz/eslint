/**
 * ESLint Rule: autocomplete-valid
 * Enforce that autocomplete attribute has valid value
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/autocomplete-valid.md
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'invalidAutocomplete';

type Options = {
  inputComponents?: string[];
};

type RuleOptions = [Options?];

const VALID_AUTOCOMPLETE_VALUES = new Set([
  'on', 'off', 'name', 'honorific-prefix', 'given-name', 'additional-name', 'family-name',
  'honorific-suffix', 'nickname', 'email', 'username', 'new-password', 'current-password',
  'organization-title', 'organization', 'street-address', 'address-line1', 'address-line2',
  'address-line3', 'address-level4', 'address-level3', 'address-level2', 'address-level1',
  'country', 'country-name', 'postal-code', 'cc-name', 'cc-given-name', 'cc-additional-name',
  'cc-family-name', 'cc-number', 'cc-exp', 'cc-exp-month', 'cc-exp-year', 'cc-csc', 'cc-type',
  'transaction-currency', 'transaction-amount', 'language', 'bday', 'bday-day', 'bday-month',
  'bday-year', 'sex', 'tel', 'tel-country-code', 'tel-national', 'tel-area-code', 'tel-local',
  'tel-extension', 'impp', 'url', 'photo'
]);

export const autocompleteValid = createRule<RuleOptions, MessageIds>({
  name: 'autocomplete-valid',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that autocomplete attribute has valid value',
    },
    messages: {
      invalidAutocomplete: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Invalid Autocomplete',
        description: 'Invalid autocomplete value',
        severity: 'MEDIUM',
        fix: 'Use a valid autocomplete token (e.g., "username", "current-password")',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/autocomplete-valid.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
            inputComponents: { type: 'array', items: { type: 'string' } }
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { inputComponents = [] } = options || {};
    const inputs = ['input', ...inputComponents];

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier' || !inputs.includes(node.name.name)) return;

        const autocomplete = node.attributes.find(attr => 
            attr.type === 'JSXAttribute' && 
            attr.name.type === 'JSXIdentifier' && 
            attr.name.name === 'autocomplete'
        );

        if (!autocomplete || autocomplete.type !== 'JSXAttribute' || !autocomplete.value || autocomplete.value.type !== 'Literal' || typeof autocomplete.value.value !== 'string') return;

        const value = autocomplete.value.value;
        // Handle space-separated values
        const tokens = value.split(/\s+/);
        
        for (const token of tokens) {
             // Handle optional 'section-' prefix
            const effectiveToken = token.startsWith('section-') ? token.replace(/^section-/, '') : token;
            
            if (!VALID_AUTOCOMPLETE_VALUES.has(effectiveToken)) {
                context.report({
                    node: autocomplete,
                    messageId: 'invalidAutocomplete',
                });
                break;
            }
        }
      },
    };
  },
});

