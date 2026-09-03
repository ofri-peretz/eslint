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
    ruleTester.run(
      'valid - role checks and safe assignments',
      noPrivilegeEscalation,
      {
        valid: [
          {
            name: 'the same assignment behind a role check',
            code: 'if (hasRole(user, "admin")) { user.role = req.body.role; }',
          },
          /*
           * A PREFIX is not a match. The user-input patterns match source text,
           * and the dotted branch had no trailing boundary — so `req.bodyParser`
           * contained `req.body` and `request.queryString` contained
           * `request.query`. Either made an ordinary property read register as
           * user input and produced a privilege-escalation finding on code with
           * no request data in it at all.
           */
          {
            name: 'a property whose name merely starts with `body`',
            code: 'function f(req) { user.role = req.bodyParser.x; }',
          },
          {
            name: 'a property whose name merely starts with `query`',
            code: 'function f(request) { user.role = request.queryString.x; }',
          },
          {
            name: 'a grant behind a role check',
            code: 'if (checkRole(user, requiredRole)) { grant(user, permission); }',
          },
          {
            name: 'a role assigned from a literal, not the request',
            code: 'const role = "admin"; user.role = role;',
          },
          {
            name: 'a role from a call this file does not tie to the request',
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
      },
    );
  });

  describe('Invalid Code - Privilege Escalation', () => {
    ruleTester.run(
      'invalid - role assignment from user input',
      noPrivilegeEscalation,
      {
        valid: [],
        invalid: [
          {
            name: 'a role assigned straight from the request body',
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
      },
    );
  });

  describe('Invalid Code - Privilege Operations', () => {
    ruleTester.run(
      'invalid - privilege operations with user input',
      noPrivilegeEscalation,
      {
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
      },
    );
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
          options: [
            {
              roleCheckPatterns: [
                'myCustomCheck',
                'hasRole',
                'checkRole',
                'isAdmin',
                'isAuthorized',
                'hasPermission',
                'checkPermission',
                'verifyRole',
                'requireRole',
              ],
            },
          ],
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

    ruleTester.run(
      'coverage - invalid regex in ignorePatterns',
      noPrivilegeEscalation,
      {
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
      },
    );

    ruleTester.run(
      'coverage - MemberExpression if condition',
      noPrivilegeEscalation,
      {
        valid: [
          {
            code: 'if (userService.hasRole(user)) { user.role = req.body.role; }',
          },
        ],
        invalid: [],
      },
    );

    ruleTester.run(
      'coverage - ConditionalExpression role check',
      noPrivilegeEscalation,
      {
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
      },
    );

    ruleTester.run(
      'coverage - privilege operations ignorePatterns',
      noPrivilegeEscalation,
      {
        valid: [
          {
            code: 'grant(user, req.body.permission);',
            options: [{ ignorePatterns: ['grant'] }],
          },
        ],
        invalid: [],
      },
    );

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
    ruleTester.run(
      'coverage - CallExpression parent with role check',
      noPrivilegeEscalation,
      {
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
      },
    );

    // Cover edge cases for MemberExpression callee
    ruleTester.run(
      'coverage - MemberExpression callee variations',
      noPrivilegeEscalation,
      {
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
      },
    );
  });

  describe('Coverage - branch gaps', () => {
    // id 2 false arm: IfStatement ancestor WITHOUT role pattern, then role check further up
    ruleTester.run(
      'coverage - nested IfStatement without role pattern',
      noPrivilegeEscalation,
      {
        valid: [
          {
            code: 'if (hasRole(user)) { if (x > 5) { user.role = req.body.role; } }',
          },
        ],
        invalid: [],
      },
    );

    // id 5 false arm: ConditionalExpression ancestor without role pattern, role check further up
    ruleTester.run(
      'coverage - ConditionalExpression without role pattern',
      noPrivilegeEscalation,
      {
        valid: [
          {
            code: 'if (hasRole(user)) { const r = isActive ? (user.role = req.body.role) : null; }',
          },
        ],
        invalid: [],
      },
    );

    // id 9+10 false arms: CallExpression with non-role Identifier callee (both Identifier branch
    // and MemberExpression branch miss, since callee is an Identifier that doesn't match patterns)
    ruleTester.run(
      'coverage - CallExpression with non-role callee',
      noPrivilegeEscalation,
      {
        valid: [
          {
            code: 'if (hasRole(user)) { doSomething(user.role = req.body.role); }',
          },
        ],
        invalid: [],
      },
    );

    // id 12 false arm: CallExpression with MemberExpression callee, property doesn't match role patterns
    ruleTester.run(
      'coverage - MemberExpression callee non-role property (line 142 false arm)',
      noPrivilegeEscalation,
      {
        valid: [
          {
            code: 'if (hasRole(user)) { obj.doSomething(user.role = req.body.role); }',
          },
        ],
        invalid: [],
      },
    );

    // id 23 false arm: AssignmentExpression where left is not MemberExpression
    ruleTester.run(
      'coverage - AssignmentExpression non-MemberExpression left',
      noPrivilegeEscalation,
      {
        valid: [{ code: 'role = req.body.role;' }],
        invalid: [],
      },
    );

    // id 25 false arm: MemberExpression property name not in role/permission list
    ruleTester.run(
      'coverage - AssignmentExpression non-role property',
      noPrivilegeEscalation,
      {
        valid: [{ code: 'user.name = req.body.name;' }],
        invalid: [],
      },
    );

    // id 39 true arm: checkObjectExpression in test file (early return)
    ruleTester.run(
      'coverage - ObjectExpression in test file',
      noPrivilegeEscalation,
      {
        valid: [
          {
            code: 'updateUser({ role: req.body.role });',
            filename: 'test.spec.ts',
            options: [{ allowInTests: true }],
          },
        ],
        invalid: [],
      },
    );

    // id 40 false arm: SpreadElement (not Property) skips the Property+Identifier check
    ruleTester.run(
      'coverage - ObjectExpression with SpreadElement',
      noPrivilegeEscalation,
      {
        valid: [{ code: 'updateUser({ ...req.body });' }],
        invalid: [],
      },
    );

    // id 42 false arm: Property with key not in role list
    ruleTester.run(
      'coverage - ObjectExpression with non-role property key',
      noPrivilegeEscalation,
      {
        valid: [{ code: 'updateUser({ name: req.body.name });' }],
        invalid: [],
      },
    );

    // id 43 true arm: matchesIgnorePattern returns true for object property
    ruleTester.run(
      'coverage - ObjectExpression with ignore pattern match',
      noPrivilegeEscalation,
      {
        valid: [
          {
            code: 'updateUser({ role: req.body.role });',
            options: [{ ignorePatterns: ['role'] }],
          },
        ],
        invalid: [],
      },
    );

    // id 44 false arm: containsUserInput returns false for object property value
    ruleTester.run(
      'coverage - ObjectExpression with non-user-input value',
      noPrivilegeEscalation,
      {
        valid: [{ code: 'updateUser({ role: "admin" });' }],
        invalid: [],
      },
    );

    // id 45 false arm: isInsideRoleCheck returns true for ObjectExpression context
    ruleTester.run(
      'coverage - ObjectExpression inside role check',
      noPrivilegeEscalation,
      {
        valid: [
          {
            code: 'if (hasRole(user)) { updateUser({ role: req.body.role }); }',
          },
        ],
        invalid: [],
      },
    );

    // id 45 true arm: ObjectExpression with role property + user input, NOT inside role check → report
    ruleTester.run(
      'coverage - ObjectExpression privilege escalation report',
      noPrivilegeEscalation,
      {
        valid: [],
        invalid: [
          {
            code: 'updateUser({ role: req.body.role });',
            errors: [{ messageId: 'privilegeEscalation' }],
          },
        ],
      },
    );
  });
});

/**
 * `testFilePattern` — the regex that decides which filenames `allowInTests`
 * applies to.
 *
 * Both cases below use the SAME source and the SAME filename and differ only
 * in the option, so the pair proves the pattern is consulted rather than
 * merely accepted. `seeds/seed-roles.ts` is neither a `*.test.*` basename nor a
 * known test directory, so the default structural predicate does not exempt it —
 * a repository that seeds roles outside those conventions gets no exemption
 * until it says so. (`fixtures/` used to sit here; it IS a test directory to
 * `isTestFilePath`, which would have made the pair vacuous.)
 */
describe('option: testFilePattern', () => {
  const SEED = 'user.role = req.body.role;';

  ruleTester.run(
    'a custom pattern extends the exemption',
    noPrivilegeEscalation,
    {
      valid: [
        {
          code: SEED,
          filename: 'seeds/seed-roles.ts',
          options: [{ allowInTests: true, testFilePattern: 'seeds/' }],
        },
      ],
      invalid: [
        // Identical source and filename, `allowInTests` still on — only the
        // pattern is gone, and the finding comes back.
        {
          code: SEED,
          filename: 'seeds/seed-roles.ts',
          options: [{ allowInTests: true }],
          errors: [{ messageId: 'privilegeEscalation' }],
        },
        // The converse: a narrower pattern than the default withdraws the
        // exemption from a file the default would have covered.
        {
          code: SEED,
          filename: 'roles.spec.ts',
          options: [{ allowInTests: true, testFilePattern: '\\.test\\.ts$' }],
          errors: [{ messageId: 'privilegeEscalation' }],
        },
      ],
    },
  );
});

/**
 * Regression locks — each FAILS on the pre-fix rule.
 *
 * 1. THE RULE'S OWN DOCUMENTED FIX DID NOT SILENCE IT. The `fix` message says
 *    `if (!hasRole(user, requiredRole)) throw new Error("Unauthorized");` —
 *    a guard clause. `isInsideRoleCheck` only walked ANCESTORS, and a guard
 *    clause is a preceding SIBLING, so a user who applied the suggested
 *    remediation verbatim still got the error.
 * 2. FALSE POSITIVES from substring verbs: `calleeName.includes('promote')`
 *    reported a chess engine's `promotePawn`, `includes('grant')` reported a
 *    funding portal's `createGrantApplication`, and `includes('revoke')`
 *    reported `URL.revokeObjectURL`.
 * 3. FALSE POSITIVES from over-broad vocabulary: `level` on the privilege
 *    property list reported `logger.level = req.body.level`, and a bare
 *    `\binput\b` user-input pattern reported a Web Audio volume fader.
 * 4. FALSE NEGATIVES: bracket notation (`user['role']`) was invisible, and so
 *    was one binding hop — both the declarator form and the destructured form.
 */
describe('regression locks', () => {
  ruleTester.run(
    'lock: a role guard clause silences the rule',
    noPrivilegeEscalation,
    {
      valid: [
        // The rule's own `fix` text, verbatim.
        {
          code: 'if (!hasRole(user, requiredRole)) throw new Error("Unauthorized"); user.role = req.body.role;',
        },
        // The Express form of the same guard.
        {
          code: 'function h(req, res, user) { if (!hasRole(req.user, "admin")) { res.status(403).end(); return; } user.role = req.body.role; }',
        },
        // Still recognised from a nested block.
        {
          code: 'function h(req, user) { if (!checkPermission(req.user)) return; if (user) { user.role = req.body.role; } }',
        },
        // The wrapping-if style keeps working.
        { code: 'if (hasRole(user, "admin")) { user.role = req.body.role; }' },
      ],
      invalid: [
        // A guard that does not exit is not a guard.
        {
          code: 'if (!hasRole(user, "admin")) { logDenied(); } user.role = req.body.role;',
          errors: [{ messageId: 'privilegeEscalation' }],
        },
        // An exiting guard that checks something other than a role.
        {
          code: 'if (!req.body.role) return; user.role = req.body.role;',
          errors: [{ messageId: 'privilegeEscalation' }],
        },
        // A deny-list of one value is not a role check.
        {
          code: 'if (req.body.role !== "superadmin") { user.role = req.body.role; }',
          errors: [{ messageId: 'privilegeEscalation' }],
        },
      ],
    },
  );

  ruleTester.run(
    'lock: privilege verbs match whole names or phrases',
    noPrivilegeEscalation,
    {
      valid: [
        // promote ⊂ promotePawn — a chess move.
        { code: 'promotePawn(board, req.body.promotion);' },
        // grant ⊂ createGrantApplication — a funding application.
        { code: 'createGrantApplication(req.body);' },
        { code: 'reportGrantTotals(req.query.programme);' },
        // revoke ⊂ revokeObjectURL — browser memory management.
        { code: 'URL.revokeObjectURL(request.body.previewUrl);' },
        { code: 'promoteCampaign(req.params.id, req.body.channel);' },
      ],
      invalid: [
        // The bare verb still counts.
        {
          code: 'grant(user, req.body.permission);',
          errors: [{ messageId: 'privilegeEscalation' }],
        },
        // So does the two-word phrase.
        {
          code: 'grantPermission(req.body.userId, req.body.permission);',
          errors: [{ messageId: 'privilegeEscalation' }],
        },
        {
          code: 'acl.revokeAccess(req.body.userId);',
          errors: [{ messageId: 'privilegeEscalation' }],
        },
      ],
    },
  );

  ruleTester.run(
    'lock: privilege vocabulary excludes level and bare input',
    noPrivilegeEscalation,
    {
      valid: [
        // A Pino verbosity control is not an authorisation decision.
        { code: 'logger.level = req.body.level;' },
        // A Web Audio fader: `.input` alone is not attacker control.
        { code: 'audioTrack.level = mixer.input.gain.value;' },
        { code: 'compressor.access = encoder.input.mode;' },
      ],
      invalid: [
        // `userInput` still names the request.
        {
          code: 'user.role = userInput.role;',
          errors: [{ messageId: 'privilegeEscalation' }],
        },
      ],
    },
  );

  ruleTester.run(
    'lock: bracket notation and one binding hop',
    noPrivilegeEscalation,
    {
      valid: [
        // A computed key that is not a privilege property.
        { code: 'user["displayName"] = req.body.displayName;' },
        // A binding that resolves to a server constant.
        { code: 'const DEFAULT_ROLE = "viewer"; user.role = DEFAULT_ROLE;' },
        // An unresolvable identifier carries no evidence.
        { code: 'user.role = somethingUndeclared;' },
      ],
      invalid: [
        // `user['role']` is the same property as `user.role`.
        {
          code: 'member["role"] = req.body.role;',
          errors: [{ messageId: 'privilegeEscalation' }],
        },
        // One declarator hop.
        {
          code: 'const requestedRole = req.body.role; member.role = requestedRole;',
          errors: [{ messageId: 'privilegeEscalation' }],
        },
        // One destructuring hop.
        {
          code: 'const { role } = req.body; user.role = role;',
          errors: [{ messageId: 'privilegeEscalation' }],
        },
        // The same hop through an object literal property.
        {
          code: 'const requestedRole = req.body.role; createUser({ role: requestedRole });',
          errors: [{ messageId: 'privilegeEscalation' }],
        },
      ],
    },
  );
});

ruleTester.run(
  'coverage - computed keys and braceless guards',
  noPrivilegeEscalation,
  {
    valid: [
      // A computed key that is neither a plain identifier nor a string literal
      // names no property the rule can judge.
      { code: 'user[key] = req.body.role;' },
      { code: 'user[0] = req.body.role;' },
    ],
    invalid: [
      // A braceless guard whose consequent is an ExpressionStatement does not
      // exit, so it does not guard anything.
      {
        code: 'if (!hasRole(user, "admin")) logDenied(); user.role = req.body.role;',
        errors: [{ messageId: 'privilegeEscalation' }],
      },
    ],
  },
);

/**
 * The three privilege vocabularies are options, and the default is exactly what
 * shipped.
 *
 * Each `options: [{}]` case restates a case from the suites above, so a default
 * that drifted would show as a disagreement between the two rather than as a
 * uniformly quiet rule.
 */
ruleTester.run(
  'options: privilege vocabularies are configurable',
  noPrivilegeEscalation,
  {
    valid: [
      // ---- the default is unchanged ----------------------------------------
      { code: 'user[key] = req.body.role;', options: [{}] },
      { code: 'logger.level = req.body.level;', options: [{}] },

      // ---- replacing a vocabulary silences the built-ins --------------------
      // A file-system product where `.access` is a mode, not an ACL.
      {
        code: 'handle.access = req.body.access;',
        options: [{ privilegeProperties: ['role'] }],
      },
      // A chess engine that really does call its ACL-free helper `setRole`.
      {
        code: 'engine.setRole(piece, req.body.role_);',
        options: [{ privilegeTerms: ['elevate'], barePrivilegeVerbs: [] }],
      },
      // `grant(...)` as a funding-domain verb rather than an ACL write.
      {
        code: 'grant(application, req.body.amount);',
        options: [{ barePrivilegeVerbs: ['revoke'] }],
      },
      // Extending never removes: a name in neither list stays quiet.
      {
        name: 'a non-authorisation field taken from the request',
        code: 'user.nickname = req.body.nickname;',
        options: [{ additionalPrivilegeProperties: ['entitlement'] }],
      },
      {
        code: 'archivePost(req.body.id);',
        options: [{ additionalPrivilegeTerms: ['impersonate user'] }],
      },
      {
        code: 'archive(req.body.id);',
        options: [{ additionalBarePrivilegeVerbs: ['impersonate'] }],
      },
    ],
    invalid: [
      // ---- the default is unchanged ----------------------------------------
      // Positive control for the `options: [{}]` valid cases above.
      {
        code: 'user.role = req.body.role;',
        options: [{}],
        errors: [{ messageId: 'privilegeEscalation' }],
      },
      {
        code: 'grant(user, req.body.permission);',
        options: [{}],
        errors: [{ messageId: 'privilegeEscalation' }],
      },

      // ---- extending a vocabulary adds coverage -----------------------------
      // An entitlement field is exactly the decision this rule polices and is
      // not in the default four.
      {
        code: 'account.entitlement = req.body.entitlement;',
        options: [{ additionalPrivilegeProperties: ['entitlement'] }],
        errors: [{ messageId: 'privilegeEscalation' }],
      },
      {
        code: 'impersonateUser(req.body.targetId);',
        options: [{ additionalPrivilegeTerms: ['impersonate user'] }],
        errors: [{ messageId: 'privilegeEscalation' }],
      },
      {
        code: 'impersonate(req.body.targetId);',
        options: [{ additionalBarePrivilegeVerbs: ['impersonate'] }],
        errors: [{ messageId: 'privilegeEscalation' }],
      },
      // Full replacement widens as well as narrows.
      {
        code: 'account.entitlement = req.body.entitlement;',
        options: [{ privilegeProperties: ['entitlement'] }],
        errors: [{ messageId: 'privilegeEscalation' }],
      },
      {
        code: 'impersonateUser(req.body.targetId);',
        options: [{ privilegeTerms: ['impersonate user'] }],
        errors: [{ messageId: 'privilegeEscalation' }],
      },
      {
        code: 'impersonate(req.body.targetId);',
        options: [{ barePrivilegeVerbs: ['impersonate'] }],
        errors: [{ messageId: 'privilegeEscalation' }],
      },
    ],
  },
);
