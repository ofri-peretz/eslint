
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';

// Rules
import { detectChildProcess } from '../detect-child-process';
import { noDirectiveInjection } from '../no-directive-injection';
import { noToctouVulnerability } from '../no-toctou-vulnerability';
import { noRedosVulnerableRegex } from '../no-redos-vulnerable-regex';
import { noBufferOverread } from '../no-buffer-overread';
import { noInsecureComparison } from '../no-insecure-comparison';
import { noUnescapedUrlParameter } from '../no-unescaped-url-parameter';
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

  describe('detect-child-process', () => {
    ruleTester.run('demo-repro', detectChildProcess, {
      valid: [],
      invalid: [
        {
          code: `
            import * as child_process from 'child_process';
            export function insecure_detectChildProcess(filename: string) {
              child_process.exec(\`cat \${filename}\`, (error, stdout) => {
                if (error) throw error;
                return stdout;
              });
            }
          `,
          errors: [{ messageId: 'childProcessCommandInjection' }]
        }
      ]
    });
  });

  describe('no-toctou-vulnerability', () => {
    ruleTester.run('demo-repro', noToctouVulnerability, {
      valid: [],
      invalid: [
        {
          code: `
            import * as fs from 'fs';
            export function insecure_noToctouVulnerability(_filePath: string) {
              const tempPath = '/tmp/report.txt';
              if (fs.existsSync(tempPath)) {
                return fs.readFileSync(tempPath, 'utf-8');
              }
              return null;
            }
          `,
          errors: [{ messageId: 'toctouVulnerability' }]
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

  describe('no-buffer-overread', () => {
    ruleTester.run('demo-repro', noBufferOverread, {
      valid: [],
      invalid: [
        {
          code: `
            export function insecure_noBufferOverread(buffer: Buffer, req: { query: { index: string } }) {
              const userIndex = Number(req.query.index);
              return buffer.readUInt8(userIndex);
            }
          `,
          errors: [{ messageId: 'missingBoundsCheck' }]
        }
      ]
    });
  });

  describe('no-insecure-comparison', () => {
    ruleTester.run('demo-repro', noInsecureComparison, {
      valid: [],
      invalid: [
        {
          code: `
            export function insecure_noInsecureComparison(provided: string, expected: string) {
              if (provided === expected) {
                return true;
              }
              return false;
            }
          `,
          errors: [{ 
            messageId: 'timingUnsafeComparison',
            suggestions: [{
              messageId: 'useStrictEquality', // The rule reuses this ID for the timing safe fix? Yes, assuming I didn't change it in rule.
              output: `
            export function insecure_noInsecureComparison(provided: string, expected: string) {
              if (crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
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



  describe('no-unescaped-url-parameter', () => {
    ruleTester.run('demo-repro', noUnescapedUrlParameter, {
      valid: [],
      invalid: [
        {
          code: `
            const window = { location: { href: '' } };
            export function insecure_noUnescapedUrlParameter(returnUrl: string) {
              const redirectUrl = \`https://example.com/dashboard?next=\${returnUrl}\`;
              window.location.href = redirectUrl;
            }
          `,
          errors: [{ messageId: 'unescapedUrlParameter' }]
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
