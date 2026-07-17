/**
 * Comprehensive tests for no-privilege-escalation rule
 * CWE-269: Improper Privilege Management
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noPrivilegeEscalation } from './index';

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
        // MemberExpression callee with updateRole keyword
        {
          code: 'authService.updateRole(user, req.body.role);',
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
        // Cover line 142-151: ConditionalExpression with CallExpression test (Identifier callee)
        {
          code: 'const result = isAdmin() ? (user.role = req.body.role) : null;',
        },
        // Cover MemberExpression callee in ternary
        {
          code: 'const result = user.hasPermission() ? (user.role = req.body.role) : null;',
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

    // Cover lines 157-170: CallExpression parent with role check patterns
    ruleTester.run('coverage - CallExpression parent with role check', noPrivilegeEscalation, {
      valid: [
        // Role assignment inside hasRole() call - covered by parent check (line 160-165)
        {
          code: 'checkRole(user, user.role = req.body.role);',
        },
        // Role assignment inside member expression role check (line 167-172)
        {
          code: 'userService.verifyRole(user, user.role = req.body.role);',
        },
        // Nested role check calls
        {
          code: 'requireRole(admin, user.permission = req.body.permission);',
        },
      ],
      invalid: [],
    });

    // Cover edge cases for MemberExpression callee
    ruleTester.run('coverage - MemberExpression callee variations', noPrivilegeEscalation, {
      valid: [
        // MemberExpression with role check property in IfStatement
        {
          code: 'if (auth.isAuthorized(user)) { user.access = req.body.access; }',
        },
        // MemberExpression with checkPermission
        {
          code: 'if (service.checkPermission(user)) { user.level = req.body.level; }',
        },
      ],
      invalid: [],
    });
  });

  describe('Coverage - branch gaps', () => {
    // id 2 false arm: IfStatement ancestor WITHOUT role pattern, then role check further up
    ruleTester.run('coverage - nested IfStatement without role pattern', noPrivilegeEscalation, {
      valid: [
        { code: 'if (hasRole(user)) { if (x > 5) { user.role = req.body.role; } }' },
      ],
      invalid: [],
    });

    // id 5 false arm: ConditionalExpression ancestor without role pattern, role check further up
    ruleTester.run('coverage - ConditionalExpression without role pattern', noPrivilegeEscalation, {
      valid: [
        { code: 'if (hasRole(user)) { const r = isActive ? (user.role = req.body.role) : null; }' },
      ],
      invalid: [],
    });

    // id 9+10 false arms: CallExpression with non-role Identifier callee (both Identifier branch
    // and MemberExpression branch miss, since callee is an Identifier that doesn't match patterns)
    ruleTester.run('coverage - CallExpression with non-role callee', noPrivilegeEscalation, {
      valid: [
        { code: 'if (hasRole(user)) { doSomething(user.role = req.body.role); }' },
      ],
      invalid: [],
    });

    // id 12 false arm: CallExpression with MemberExpression callee, property doesn't match role patterns
    ruleTester.run('coverage - MemberExpression callee non-role property (line 142 false arm)', noPrivilegeEscalation, {
      valid: [
        { code: 'if (hasRole(user)) { obj.doSomething(user.role = req.body.role); }' },
      ],
      invalid: [],
    });

    // id 23 false arm: AssignmentExpression where left is not MemberExpression
    ruleTester.run('coverage - AssignmentExpression non-MemberExpression left', noPrivilegeEscalation, {
      valid: [
        { code: 'role = req.body.role;' },
      ],
      invalid: [],
    });

    // id 25 false arm: MemberExpression property name not in role/permission list
    ruleTester.run('coverage - AssignmentExpression non-role property', noPrivilegeEscalation, {
      valid: [
        { code: 'user.name = req.body.name;' },
      ],
      invalid: [],
    });

    // id 39 true arm: checkObjectExpression in test file (early return)
    ruleTester.run('coverage - ObjectExpression in test file', noPrivilegeEscalation, {
      valid: [
        { code: 'updateUser({ role: req.body.role });', filename: 'test.spec.ts', options: [{ allowInTests: true }] },
      ],
      invalid: [],
    });

    // id 40 false arm: SpreadElement (not Property) skips the Property+Identifier check
    ruleTester.run('coverage - ObjectExpression with SpreadElement', noPrivilegeEscalation, {
      valid: [
        { code: 'updateUser({ ...req.body });' },
      ],
      invalid: [],
    });

    // id 42 false arm: Property with key not in role list
    ruleTester.run('coverage - ObjectExpression with non-role property key', noPrivilegeEscalation, {
      valid: [
        { code: 'updateUser({ name: req.body.name });' },
      ],
      invalid: [],
    });

    // id 43 true arm: matchesIgnorePattern returns true for object property
    ruleTester.run('coverage - ObjectExpression with ignore pattern match', noPrivilegeEscalation, {
      valid: [
        { code: 'updateUser({ role: req.body.role });', options: [{ ignorePatterns: ['role'] }] },
      ],
      invalid: [],
    });

    // id 44 false arm: containsUserInput returns false for object property value
    ruleTester.run('coverage - ObjectExpression with non-user-input value', noPrivilegeEscalation, {
      valid: [
        { code: 'updateUser({ role: "admin" });' },
      ],
      invalid: [],
    });

    // id 45 false arm: isInsideRoleCheck returns true for ObjectExpression context
    ruleTester.run('coverage - ObjectExpression inside role check', noPrivilegeEscalation, {
      valid: [
        { code: 'if (hasRole(user)) { updateUser({ role: req.body.role }); }' },
      ],
      invalid: [],
    });

    // id 45 true arm: ObjectExpression with role property + user input, NOT inside role check → report
    ruleTester.run('coverage - ObjectExpression privilege escalation report', noPrivilegeEscalation, {
      valid: [],
      invalid: [
        {
          code: 'updateUser({ role: req.body.role });',
          errors: [{ messageId: 'privilegeEscalation' }],
        },
      ],
    });
  });
});

