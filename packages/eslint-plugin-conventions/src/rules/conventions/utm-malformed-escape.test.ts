/**
 * A malformed percent-escape must not stop ESLint.
 *
 * `decodeURIComponent` throws `URIError` on `%E0%A4%A`, and an exception inside
 * a rule stops ESLint for the whole file rather than reporting anything. This
 * became reachable when the `TemplateLiteral` visitor gained a
 * `?? quasi.value.raw` fallback for @typescript-eslint 8.68.0, which types
 * `cooked` as null exactly when the escape is invalid — so raw text carrying a
 * broken escape now reaches the decoder. Reported by CodeRabbit on PR #783.
 *
 * The guard does not swallow the finding. An undecodable value is checked on
 * its literal text, and `%E0%A4%A` is not in the taxonomy either, so it still
 * reports — which is the point: the rule keeps working instead of throwing.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { utmTaxonomy } from './utm-taxonomy';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('utm-taxonomy — a malformed escape does not crash', utmTaxonomy, {
  valid: [
    {
      name: 'a well-formed tagged template is still read normally',
      code: 'const u = tag`https://x.test/?utm_source=github&utm_medium=referral`;',
    },
  ],
  invalid: [
    {
      name: 'a truncated escape reports instead of throwing URIError',
      code: 'const u = tag`https://x.test/?utm_source=%E0%A4%A&utm_medium=email`;',
      errors: [{ messageId: 'invalidUtmSource' }],
    },
    {
      name: 'a bare percent reports instead of throwing URIError',
      code: 'const u = tag`https://x.test/?utm_source=%&utm_medium=email`;',
      errors: [{ messageId: 'invalidUtmSource' }],
    },
  ],
});
