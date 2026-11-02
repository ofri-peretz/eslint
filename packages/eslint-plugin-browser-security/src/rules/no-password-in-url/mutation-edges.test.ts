/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-19).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noPasswordInUrl } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-password-in-url (mutation edges)', noPasswordInUrl, {
  valid: [
    {
      name: 'an empty username and an empty password carry no secret',
      code: "const u = 'https://:@api.acme-corp.io/x';",
    },
    {
      name: 'a username with an empty password carries no secret',
      code: "const u = 'https://deploy:@api.acme-corp.io/x';",
    },
    {
      name: 'a password in the query string belongs to no-credentials-in-query-params',
      code: "const login = 'https://api.acme-corp.io/login?user=bob&password=hunter2';",
    },
    {
      name: 'a fragment parameter that does not end in a password word is not a password',
      code: "location.href = 'https://app.acme-corp.io/#tab=settings';",
    },
    {
      name: 'a fragment parameter that only starts with a password word is not a password',
      code: "location.href = 'https://app.acme-corp.io/#passwordHint=pet';",
    },
  ],
  invalid: [
    {
      name: 'credentials in the left operand of a concatenation',
      code: "const u = 'https://admin:s3cret@' + host;",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a URL literal compared, not concatenated, is checked on its own',
      code: "if (url === 'https://admin:hunter2@api.acme-corp.io') {}",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a literal inside a template is reported once, on the template',
      code: `const u = \`\${'https://admin:hunter2@api.acme-corp.io'}\`;`,
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a folded substitution supplies the password',
      code: `const u = \`https://admin\${':hunter2'}@api.acme-corp.io\`;`,
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a ws:// URL carries userinfo credentials like http',
      code: "const u = 'ws://bot:hunter2@chat.acme-corp.io/feed';",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a fragment parameter whose name ends in a password word is a password',
      code: "location.href = 'https://app.acme-corp.io/#user=bob&adminPwd=hunter2';",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a unary plus does not make a URL literal part of a concatenation',
      code: "const n = +'https://admin:hunter2@api.acme-corp.io';",
      errors: [{ messageId: 'violationDetected' }],
    },
    // @found Stryker mutation-survivor triage, 2026-11-02
    {
      name: 'FN: a long concatenation keeps its leading scheme and userinfo',
      code: "const u = 'https://' + user + ':' + pass + '@' + host + '/' + a + '/' + b + '/' + c + '/' + d;",
      errors: [{ messageId: 'violationDetected' }],
    },
    // @found Stryker mutation-survivor triage, 2026-10-19
    {
      name: 'FN: a password after an empty username is still a password',
      code: "const u = 'https://:hunter2@api.acme-corp.io/x';",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
