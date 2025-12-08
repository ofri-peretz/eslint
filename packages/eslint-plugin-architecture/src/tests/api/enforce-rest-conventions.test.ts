/**
 * Comprehensive tests for enforce-rest-conventions rule
 * API: Validates REST endpoint design against best practices
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { enforceRestConventions } from '../../rules/api/enforce-rest-conventions';

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

describe('enforce-rest-conventions', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - REST conventions', enforceRestConventions, {
      valid: [
        {
          code: `
            app.get('/users', (req, res) => {
              res.status(200).json(users);
            });
          `,
        },
        {
          code: `
            app.post('/users', (req, res) => {
              res.status(201).json(newUser);
            });
          `,
        },
        {
          code: `
            app.delete('/users/:id', (req, res) => {
              res.status(204).send();
            });
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - REST Convention Violations', () => {
    ruleTester.run('invalid - REST violations', enforceRestConventions, {
      valid: [],
      invalid: [
        {
          code: `
            app.get('/user', (req, res) => {
              res.json(users);
            });
          `,
          errors: [{ messageId: 'restConventionViolation' }],
        },
        {
          code: `
            router.post('/order', handler);
          `,
          errors: [{ messageId: 'restConventionViolation' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - disable checks', enforceRestConventions, {
      valid: [
        {
          code: `
            app.get('/user', handler);
          `,
          options: [{ checkResourceNaming: false }],
        },
      ],
      invalid: [
        {
          code: `
            app.get('/user', handler);
          `,
          options: [{ checkResourceNaming: true }],
          errors: [{ messageId: 'restConventionViolation' }],
        },
      ],
    });
  });
});

