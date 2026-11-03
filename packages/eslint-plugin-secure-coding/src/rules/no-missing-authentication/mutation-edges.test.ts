/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingAuthentication } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const missing = [{ messageId: 'missingAuthentication' as const }];
const H = '(req, res) => {}';

describe('no-missing-authentication (mutation edges)', () => {
  ruleTester.run('no-missing-authentication', noMissingAuthentication, {
    valid: [
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: a dynamically keyed member of an auth object is auth middleware',
        // @found mutation testing
        code: `const app = express(); app.get('/admin', auth[mode], ${H});`,
      },
      {
        name: 'FP: a called dynamically keyed member of an auth object is auth middleware',
        // @found mutation testing
        code: `const app = express(); app.get('/admin', auth[mode](), ${H});`,
      },
      {
        name: 'a route on a call result is not a route chain',
        code: `getRouter().get('/admin', ${H});`,
      },
      {
        name: 'a router-named Map is a Map',
        code: `const router = new Map(); router.get('/admin', ${H});`,
      },
      {
        name: 'a router-named object literal is not a router',
        code: `const router = {}; router.get('/admin', ${H});`,
      },
      {
        name: 'a router-named array is not a router',
        code: `const router = []; router.get('/admin', ${H});`,
      },
      {
        name: 'a binding initialised from another binding is judged by its name',
        code: `const store = cache; store.get('/admin', ${H});`,
      },
      {
        name: 'an indirect (0, fn)() call is not a router factory',
        code: `const store = (0, makeCache)(); store.get('/admin', ${H});`,
      },
      {
        name: 'any initialised non-router binding is not a router',
        code: `const store = getStore(); store.get('/admin', ${H});`,
      },
      {
        name: 'a guard declared in a function declaration is found',
        code: `function setup() { const guard = authenticate(); router.get('/admin', guard, ${H}); }`,
      },
      {
        name: 'a guard declared in a function expression is found',
        code: `const setup = function () { const guard = authenticate(); router.get('/admin', guard, ${H}); };`,
      },
      {
        name: 'a guard declared in an arrow body is found',
        code: `const setup = () => { const guard = authenticate(); router.get('/admin', guard, ${H}); };`,
      },
      {
        name: 'the guard declaration is found by its own name, not the first declaration',
        code: `const options = {}; const guard = authenticate(); router.get('/admin', guard, ${H});`,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: a binding of passport.authenticate() is auth middleware',
        code: `const guard = passport.authenticate('jwt'); router.get('/admin', guard, ${H});`,
      },
      {
        name: 'the object of a member middleware is part of its name',
        code: `router.get('/admin', auth.check, ${H});`,
      },
      {
        name: 'a route chain on a member receiver is not judged',
        code: `this.app.route('/admin').get(${H});`,
      },
      {
        name: 'app.use() with no arguments mounts nothing',
        code: 'app.use();',
      },
      {
        name: 'a template-literal public path is still public',
        code: `app.get(\`/health\`, ${H});`,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: a named handler inside an auth wrapper is wrapped like an inline one',
        code: "requireAuth(router.get('/admin', adminHandler));",
      },
    ],
    invalid: [
      {
        name: 'a dynamically keyed member of a non-auth object is not auth middleware',
        code: `const app = express(); app.get('/admin', handlers[mode], ${H});`,
        errors: missing,
      },
      {
        name: 'a test file is checked unless allowInTests is set',
        filename: 'src/admin.test.ts',
        code: `router.get('/admin', ${H});`,
        errors: missing,
      },
      {
        name: 'a router binding found among other references is still a router',
        code: `const store = new Map(); store.set(1, 2); const api = express.Router(); api.get('/admin', ${H});`,
        errors: missing,
      },
      {
        name: 'a declared-later router binding is judged by its name',
        code: `let app; app = express(); app.get('/admin', ${H});`,
        errors: missing,
      },
      {
        name: 'a dynamically keyed wrapper call is not an auth wrapper',
        code: `registry[kind](router.get('/admin', ${H}));`,
        errors: missing,
      },
      {
        name: 'only use/all calls mount middleware around a route',
        code: `registry.add(authenticate, router.get('/admin', ${H}));`,
        errors: missing,
      },
      {
        name: 'the path argument is not middleware',
        code: `router.get(authPath, ${H});`,
        errors: missing,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a template-literal mount path is a path',
        code: 'app.use(`/admin`, adminRouter);',
        errors: missing,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a regular-expression mount path is a path',
        code: 'app.use(/^\\/admin/, adminRouter);',
        errors: missing,
      },
    ],
  });
});
