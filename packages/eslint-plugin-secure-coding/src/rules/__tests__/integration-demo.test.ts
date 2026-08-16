
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';

// Rules
import { noDirectiveInjection } from '../no-directive-injection';
import { noRedosVulnerableRegex } from '../no-redos-vulnerable-regex';
import { noInsecureComparison } from '../no-insecure-comparison';
import { noImproperSanitization } from '../no-improper-sanitization';
import { noImproperTypeValidation } from '../no-improper-type-validation';
import { noPrivilegeEscalation } from '../no-privilege-escalation';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('Demo Gaps Reproduction', () => {

  describe('no-directive-injection', () => {
    ruleTester.run('demo-repro', noDirectiveInjection, {
      valid: [],
      invalid: [
        {
          code: `
            declare const Handlebars: any;
            export function insecure_noDirectiveInjection(userInputTemplate: string, data: object) {
              const compiled = Handlebars.compile(userInputTemplate);
              return compiled(data);
            }
          `,
          errors: [{ messageId: 'userControlledTemplate' }]
        }
      ]
    });
  });


  describe('no-redos-vulnerable-regex', () => {
    ruleTester.run('demo-repro', noRedosVulnerableRegex, {
      valid: [],
      invalid: [
        {
          code: `
            export function insecure_noRedosVulnerableRegex(email: string) {
              const catastrophic = /(a+)+b/;
              return catastrophic.test(email);
            }
          `,
          errors: [{ messageId: 'redosVulnerable' }]
        }
      ]
    });
  });


  describe('no-insecure-comparison', () => {
    /**
     * This block used to assert that
     *
     *   export function insecure_noInsecureComparison(provided: string, expected: string) {
     *     if (provided === expected) { return true; }
     *   }
     *
     * was a CWE-208 timing finding. Two plainly-typed string PARAMETERS compared with
     * `===`; there is no secret anywhere in the program. The report came from a chain
     * of three name matches: the function name matched
     * `/security|auth|crypto|hash|token|secret|insecure|verify|validate/` — on the word
     * "insecure", which is in the FIXTURE'S OWN NAME — and that promoted the generic
     * identifiers `provided` and `expected` into the secret vocabulary. Rename the
     * function to `compare_noInsecureComparison` and the finding disappears.
     *
     * A demo fixture named after the rule it is demonstrating is the worst possible
     * shape for a heuristic that reads names, and this one passed because of it. The
     * case is kept as VALID, plus the same comparison with real evidence of a secret
     * alongside it, so the pair disagrees for a reason that is in the code.
     */
    ruleTester.run('demo-repro', noInsecureComparison, {
      valid: [
        `
            export function insecure_noInsecureComparison(provided: string, expected: string) {
              if (provided === expected) {
                return true;
              }
              return false;
            }
          `,
      ],
      invalid: [
        {
          code: `
            export function insecure_noInsecureComparison(providedToken: string, expectedToken: string) {
              if (providedToken === expectedToken) {
                return true;
              }
              return false;
            }
          `,
          errors: [{ 
            messageId: 'timingUnsafeComparison',
            suggestions: [{
              messageId: 'useTimingSafeEqual',
              output: `
            export function insecure_noInsecureComparison(providedToken: string, expectedToken: string) {
              if (crypto.timingSafeEqual(Buffer.from(providedToken), Buffer.from(expectedToken))) {
                return true;
              }
              return false;
            }
          `
            }]
          }]
        }
      ]
    });
  });



  describe('no-improper-sanitization', () => {
    ruleTester.run('demo-repro', noImproperSanitization, {
      valid: [],
      invalid: [
        {
          code: `
            export function insecure_noImproperSanitization(input: string) {
              return input.replace(/</g, '&lt;');
            }
          `,
          errors: [{ messageId: 'incompleteHtmlEscaping' }]
        }
      ]
    });
  });

  describe('no-improper-type-validation', () => {
    ruleTester.run('demo-repro', noImproperTypeValidation, {
      valid: [],
      invalid: [
        {
          code: `
            export function insecure_noImproperTypeValidation(input: unknown): string | undefined {
              if (typeof input === 'object') {
                return (input as { toString: () => string }).toString();
              }
              return undefined;
            }
          `,
          errors: [{ messageId: 'unsafeTypeofCheck' }]
        }
      ]
    });
  });

  describe('no-privilege-escalation', () => {
    ruleTester.run('demo-repro', noPrivilegeEscalation, {
      valid: [],
      invalid: [
        {
          code: `
            declare const app: any;
            declare const db: any;
            export function insecure_noPrivilegeEscalation() {
              app.post('/user/update-role', (req: { body: { userId: string; role: string } }) => {
                db.updateUser(req.body.userId, { role: req.body.role });
              });
            }
          `,
          errors: [{ messageId: 'privilegeEscalation' }]
        }
      ]
    });
  });



});
