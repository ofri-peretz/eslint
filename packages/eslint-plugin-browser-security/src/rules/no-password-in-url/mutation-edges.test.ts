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
    // @found Stryker mutation-survivor triage, 2026-10-19
    {
      name: 'FN: a password after an empty username is still a password',
      code: "const u = 'https://:hunter2@api.acme-corp.io/x';",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
