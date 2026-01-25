/**
 * @fileoverview Tests for no-unvalidated-deeplinks
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnvalidatedDeeplinks } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-unvalidated-deeplinks', noUnvalidatedDeeplinks, {
  valid: [
    // Static URLs are safe
    { code: "Linking.openURL('https://example.com')" },
    { code: "navigation.navigate('Home')" },
    { code: "const url = 'myapp://page'" },
  ],

  invalid: [
    // Variable URLs without validation
    { code: "Linking.openURL(deeplinkUrl)", errors: [{ messageId: 'violationDetected' }] },
    { code: "Linking.openURL(params.url)", errors: [{ messageId: 'violationDetected' }] },
    { code: "navigation.navigate(targetScreen)", errors: [{ messageId: 'violationDetected' }] },
  ],
});
