/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-18).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { detectMixedContent } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('detect-mixed-content (mutation edges)', detectMixedContent, {
  valid: [
    {
      name: 'an https literal assigned to .src is not mixed content',
      code: "const img = document.createElement('img'); img.src = 'https://cdn.acme-corp.io/a.png';",
    },
    {
      name: 'an https template in a subresource position is not mixed content',
      code: 'const a = <img src={`https://cdn.acme-corp.io/${id}.png`} />;',
    },
    {
      name: 'a relative template in a subresource position is not mixed content',
      code: 'const a = <img src={`/thumbs/${id}.png`} />;',
    },
    {
      name: 'http:// inside the query of a same-origin src is not the load scheme',
      code: 'const a = <img src="/proxy?u=http://cdn.acme-corp.io/a.png" />;',
    },
  ],
  invalid: [],
});
