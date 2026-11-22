/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Google's tokeninfo endpoint is documented as a GET with `?id_token=` (Worklenz
 * auth-controller.ts:538, dogfood round 2). Other hosts and other credentials in the
 * same URL are still reported.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noCredentialsInQueryParams } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-credentials-in-query-params — google tokeninfo',
  noCredentialsInQueryParams,
  {
    valid: [
      {
        name: 'template',
        code: 'axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);',
      },
      {
        name: 'literal, access_token',
        code: "fetch('https://oauth2.googleapis.com/tokeninfo?access_token=abc');",
      },
      {
        name: 'v3 path',
        code: "fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=abc');",
      },
    ],
    invalid: [
      {
        name: 'control: the Google URL is only a query value on another host',
        code: "fetch('https://evil.test/?next=https://oauth2.googleapis.com/tokeninfo&access_token=abc');",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'control: only id_token and access_token are exempt on the endpoint',
        code: "fetch('https://oauth2.googleapis.com/tokeninfo?id_token=abc&password=p');",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'control: another host',
        code: "fetch('https://example.com/tokeninfo?id_token=abc');",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'control: a tokeninfo-looking path on another host',
        code: "fetch('https://evil.test/?next=https://oauth2.googleapis.com/x&access_token=abc');",
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  },
);
