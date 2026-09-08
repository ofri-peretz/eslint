/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A CSS class is not a credential, whatever the object key is called.
 *
 * Found dogfooding on `apps/engage` in ofri-peretz/blog, the first time that
 * app was ever linted (#943). Reported at CWE-798 / CVSS 9.8 / CRITICAL:
 *
 *   apps/engage/src/app/queue/page.tsx:16
 *     const TONE: Record<Gate, string> = {
 *       pass: "text-[var(--success)]",
 *       "below-bar": "text-[var(--warning)]",
 *       unscored: "text-[var(--muted-foreground)]",
 *     };
 *
 * `pass` is a gate outcome. The value is a Tailwind arbitrary-value class
 * wrapping a CSS custom property. Nothing in it is a secret, and a reader who
 * trusts a 9.8 stops what they are doing to look at a colour token.
 *
 * The rule's own doctrine is that it "decides on the *value*, never on the key
 * name alone" — so the miss is in the value guards, not the name gate, exactly
 * as it was for `mtls_incompatible_client_auth` and `<rootDir>/…`. A value
 * carrying CSS syntax — `var(--x)`, a bracketed arbitrary value, a `--custom`
 * property — is a style token, and style tokens are written to be read.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { noHardcodedCredentials } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('a style token is not a secret', noHardcodedCredentials, {
  valid: [
    {
      name: 'the exact map that reported 9.8 in engage',
      code: `
        const TONE = {
          pass: "text-[var(--success)]",
          "below-bar": "text-[var(--warning)]",
          unscored: "text-[var(--muted-foreground)]",
        };
      `,
    },
    {
      name: 'a bare CSS custom property under a credential-shaped key',
      code: `const theme = { secret: "var(--brand-orange)" };`,
    },
    {
      name: 'a Tailwind arbitrary value under a credential-shaped key',
      code: `const styles = { token: "bg-[#0a0a0a]" };`,
    },
    {
      name: 'a custom-property declaration under a credential-shaped key',
      code: `const vars = { key: "--container-prose" };`,
    },
  ],
  invalid: [
    {
      /*
       * The control. Widening the value guards must not stop the rule finding
       * a real secret that happens to sit in an object — otherwise the fix
       * trades a false positive for a false negative, which is the worse of
       * the two for a security rule. The value is deliberately NOT shaped like
       * any provider's key (no `sk_live_` etc) — GitHub push protection blocks
       * a push containing one even when the value is invented.
       */
      name: 'a real committed secret in the same shape still reports',
      code: `const config = { apiKey: "Xq7vT2mKp9wRzB4nHc6LdF8sJ3yA5eU1" };`,
      errors: 1,
    },
  ],
});
