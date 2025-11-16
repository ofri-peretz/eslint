/**
 * Comprehensive tests for no-privilege-escalation rule
 * CWE-269: Improper Privilege Management
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noPrivilegeEscalation } from '../rules/security/no-privilege-escalation';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-privilege-escalation', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - role checks and safe assignments', noPrivilegeEscalation, {
      valid: [
        {
          code: 'if (hasRole(user, "admin")) { user.role = req.body.role; }',
        },
        {
          code: 'if (checkRole(user, requiredRole)) { grant(user, permission); }',
        },
        {
          code: 'const role = "admin"; user.role = role;',
        },
        {
          code: 'user.role = getDefaultRole();',
        },
        {
          code: 'if (isAuthorized(user)) { setRole(user, req.body.role); }',
        },
        // Test files (when allowInTests is true)
        {
          code: 'user.role = req.body.role;',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
        // Ignored patterns
        {
          code: 'user.role = req.body.role;',
          options: [{ ignorePatterns: ['user.role'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Privilege Escalation', () => {
    ruleTester.run('invalid - role assignment from user input', noPrivilegeEscalation, {
      valid: [],
      invalid: [
        {
          code: 'user.role = req.body.role;',
          errors: [
            {
              messageId: 'privilegeEscalation',
            },
          ],
        },
        {
          code: 'user.permission = req.query.permission;',
          errors: [
            {
              messageId: 'privilegeEscalation',
            },
          ],
        },
        {
          code: 'user.privilege = request.body.privilege;',
          errors: [
            {
              messageId: 'privilegeEscalation',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Privilege Operations', () => {
    ruleTester.run('invalid - privilege operations with user input', noPrivilegeEscalation, {
      valid: [],
      invalid: [
        {
          code: 'grant(user, req.body.permission);',
          errors: [
            {
              messageId: 'privilegeEscalation',
            },
          ],
        },
        {
          code: 'setRole(user, req.query.role);',
          errors: [
            {
              messageId: 'privilegeEscalation',
            },
          ],
        },
        {
          code: 'userService.elevate(user, req.body.level);',
          errors: [
            {
              messageId: 'privilegeEscalation',
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - allowInTests', noPrivilegeEscalation, {
      valid: [
        {
          code: 'user.role = req.body.role;',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'user.role = req.body.role;',
          filename: 'server.ts',
          options: [{ allowInTests: true }],
          errors: [
            {
              messageId: 'privilegeEscalation',
            },
          ],
        },
      ],
    });

    ruleTester.run('options - roleCheckPatterns', noPrivilegeEscalation, {
      valid: [
        {
          code: 'if (myCustomCheck(user)) { user.role = req.body.role; }',
          options: [{ roleCheckPatterns: ['myCustomCheck', 'hasRole', 'checkRole', 'isAdmin', 'isAuthorized', 'hasPermission', 'checkPermission', 'verifyRole', 'requireRole'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('options - userInputPatterns', noPrivilegeEscalation, {
      valid: [],
      invalid: [
        {
          code: 'user.role = customInput.role;',
          options: [{ userInputPatterns: ['customInput'] }],
          errors: [
            {
              messageId: 'privilegeEscalation',
            },
          ],
        },
      ],
    });

    ruleTester.run('options - ignorePatterns', noPrivilegeEscalation, {
      valid: [
        {
          code: 'user.role = req.body.role;',
          options: [{ ignorePatterns: ['user.role'] }],
        },
      ],
      invalid: [
        {
          code: 'user.permission = req.body.permission;',
          options: [{ ignorePatterns: ['user.role'] }],
          errors: [
            {
              messageId: 'privilegeEscalation',
            },
          ],
        },
      ],
    });

    ruleTester.run('coverage - invalid regex in ignorePatterns', noPrivilegeEscalation, {
      valid: [],
      invalid: [
        {
          code: 'user.role = req.body.role;',
          options: [{ ignorePatterns: ['['] }], // Invalid regex - should not match
          errors: [
            {
              messageId: 'privilegeEscalation',
            },
          ],
        },
      ],
    });

    ruleTester.run('coverage - MemberExpression if condition', noPrivilegeEscalation, {
      valid: [
        {
          code: 'if (userService.hasRole(user)) { user.role = req.body.role; }',
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - ConditionalExpression role check', noPrivilegeEscalation, {
      valid: [
        {
          code: 'const result = hasRole(user) ? user.role = req.body.role : null;',
        },
        {
          code: 'const result = checkRole(user) ? user.role = req.body.role : null;',
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - privilege operations ignorePatterns', noPrivilegeEscalation, {
      valid: [
        {
          code: 'grant(user, req.body.permission);',
          options: [{ ignorePatterns: ['grant'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - test file early return', noPrivilegeEscalation, {
      valid: [
        {
          code: 'grant(user, req.body.permission);',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [],
    });
  });
});

