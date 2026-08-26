/**
 * @fileoverview Tests for no-client-side-auth-logic
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noClientSideAuthLogic } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-client-side-auth-logic', noClientSideAuthLogic, {
  valid: [
    // Server-side auth checks
    { name: 'the token is verified', code: "if (await verifyToken(token)) { proceed() }" },
    { code: "const isAuth = await authService.verify()" },
    // Non-auth localStorage usage
    { code: "if (localStorage.getItem('theme')) { setTheme() }" },
    { code: "const x = 1" },

    // --- A flag test is not an auth decision -------------------------------
    // Corpus: okta/okta-signin-widget
    // src/v2/ion/ui-schema/ion-string-handler.js:79 — `secret: true` marks a
    // form field for password rendering. Nothing is authorised here.
    { code: "if (ionFormField.secret === true) { Object.assign(uiSchema, getPasswordUiSchema(settings)) }" },
    { code: "if (field.secret === false) { renderPlain() }" },
    // Presence tests, same category.
    { code: "if (creds.password === null) { promptForPassword() }" },
    { code: "if (creds.token === undefined) { fetchToken() }" },
    { code: "if (undefined !== creds.token) { use(creds.token) }" },
  ],

  invalid: [
    // Local storage auth checks
    { name: 'an admin flag read out of localStorage', code: "if (localStorage.getItem('isAdmin')) { showAdmin() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (localStorage.getItem('authenticated')) { proceed() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (localStorage.getItem('role')) { checkRole() }", errors: [{ messageId: 'violationDetected' }] },
    // Password comparison
    { code: "if (user.password === input) { login() }", errors: [{ messageId: 'violationDetected' }] },
    // The narrowing must not become an FN: a credential compared against a
    // real value is still a client-side auth decision, in either position and
    // against any non-flag operand.
    { code: "if (input === user.password) { login() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (user.secret === form.secret) { grant() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (user.token === 'abc123') { grant() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (user.password === getInput()) { login() }", errors: [{ messageId: 'violationDetected' }] },
  ],
});

/**
 * REGRESSION LOCK — whole-word matching, and a configurable vocabulary.
 *
 * `authKeywords.some(kw => key.includes(kw))` reported
 * `localStorage.getItem("recipe-casserole-draft")` because `role` lives inside
 * `casserole`. This rule ships at `error` in `recommended`, so that CRITICAL
 * finding reached every consumer of the preset, with `schema: []` — no option
 * could turn it off short of disabling the rule.
 *
 * Two traps this block pins, both of which bit during the fix:
 *   - the key must NOT be lowercased before segmenting, or `isAdmin` becomes
 *     "isadmin", loses its only word boundary, and stops matching `admin`
 *   - an empty `authKeywords` must disable the heuristic entirely
 *
 * The casserole case FAILS on the pre-fix rule.
 */
ruleTester.run('no-client-side-auth-logic-whole-word', noClientSideAuthLogic, {
  valid: [
    'if (localStorage.getItem("recipe-casserole-draft")) { restore(); }',
    'if (localStorage.getItem("authorship")) { render(); }',
    {
      code: 'if (localStorage.getItem("isAdmin")) { showPanel(); }',
      options: [{ authKeywords: [] }],
    },
  ],
  invalid: [
    {
      code: 'if (localStorage.getItem("isAdmin")) { showPanel(); }',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'if (localStorage.getItem("user-role")) { showPanel(); }',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'if (localStorage.getItem("tenant-id")) { showPanel(); }',
      options: [{ authKeywords: ['tenant'] }],
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      // credentialProperties: the second option, exercised in its overridden
      // state. An option no test sets ships with its branch unexecuted, which
      // is what the rule-audit ratchet flagged when this block omitted it.
      code: 'if (form.passphrase === stored.passphrase) { login(); }',
      options: [{ credentialProperties: ['passphrase'] }],
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// ── Adversarial-corpus regression locks ───────────────────────────────────
//
// The corpus took this rule from 100% to 55.6% recall in one wave. Everything
// below FAILS on the pre-corpus rule, and every miss was the same mistake:
// matching ONE spelling of a sink instead of resolving it.
ruleTester.run('no-client-side-auth-logic — adversarial', noClientSideAuthLogic, {
  valid: [
    // Substring false positives. `role ⊂ casserole` shipped at CRITICAL in the
    // `recommended` preset.
    "if (localStorage.getItem('recipe-casserole-draft')) { restoreDraft(); }",
    "if (localStorage.getItem('authorship-draft')) { restoreByline(); }",
    "if (localStorage.getItem('preauthorized-payment-nonce-v1')) { resume(); }",
    // Exact membership against the two web-storage globals keeps every cache
    // and every LRU wrapper out.
    "const myStorage = createCache(); if (myStorage.getItem('user-role')) { warm(); }",
    // A rendering flag, not a credential comparison.
    'if (formField.secret === true) { renderAsPasswordInput(formField); }',
    // The correct remediation: render what the SERVER decided.
    'const nav = permissions.canManageUsers ? adminLink : null;',
  ],
  invalid: [
    // `window.localStorage` is `localStorage` — the spelling every
    // implicit-globals lint rule asks you to write.
    {
      code: "if (window.localStorage.getItem('isAdmin')) { enableDangerZone(); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // `sessionStorage` is the same trust boundary; it just expires sooner.
    {
      code: "if (sessionStorage.getItem('role')) { renderModeratorTools(); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // The key held in a constant — what every codebase with more than one key
    // does. A `Literal`-only check could not see it.
    {
      code: "const ROLE_KEY = 'user_role'; if (localStorage.getItem(ROLE_KEY)) { showAuditLog(); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // `getItem` returns a STRING, so this is the idiomatic spelling — and a
    // bare-call check saw a BinaryExpression and gave up.
    {
      code: "if (localStorage.getItem('isAdmin') === 'true') { showBillingExport(); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // React gates render with a ternary far more often than with an `if`.
    {
      code: "const view = localStorage.getItem('isAdmin') ? dangerZone : readOnly;",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Naming the decision does not move it off the client.
    {
      code: "const canPurge = sessionStorage.getItem('role') && enabled('purge'); if (canPurge) { purge(); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // ONE report, not two. `no-nestjs-security` shipped a test pinning two
    // errors from one rule on one line as correct; this asserts the opposite.
    {
      code: "if (localStorage.getItem('role') === user.password) { grant(); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // FALSE-NEGATIVE DIRECTION: innocuous identifiers, same comparison.
    {
      code: 'function step(a, b) { if (a.password === b) { proceed(); } }',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// ── Test-expression walk refusals ─────────────────────────────────────────
ruleTester.run('no-client-side-auth-logic — refusals', noClientSideAuthLogic, {
  valid: [
    // A test nested past the walk budget is refused rather than walked.
    "if (!(!(!(!(!(!(!(!(localStorage.getItem('isAdmin'))))))))))  { go(); }",
    // A key that resolves to no string.
    'if (localStorage.getItem(42)) { go(); }',
    'if (localStorage.getItem()) { go(); }',
    'if (localStorage.getItem(...args)) { go(); }',
    // A computed `getItem`.
    "if (localStorage['getItem']('isAdmin')) { go(); }",
    // A different method on the right global.
    "if (localStorage.key('isAdmin')) { go(); }",
    // A test that is neither a call, a unary, a binary nor an identifier.
    "if ([localStorage.getItem('isAdmin')]) { go(); }",
    // An identifier that resolves to nothing.
    'if (unknownFlag) { go(); }',
  ],
  invalid: [
    // The negated read is still the same decision.
    {
      code: "if (!localStorage.getItem('isAdmin')) { showReadOnly(); }",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
