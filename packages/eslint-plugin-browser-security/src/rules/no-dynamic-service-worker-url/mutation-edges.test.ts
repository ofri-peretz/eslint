/**
 * Mutation-survivor kill fixtures for no-dynamic-service-worker-url.
 *
 * Pins which receivers are the ServiceWorkerContainer (global-qualified
 * navigator, scope-resolved and destructured bindings), that only `register`
 * is the sink, and which `new URL(path, base)` bases count as static.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDynamicServiceWorkerUrl } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-dynamic-service-worker-url', noDynamicServiceWorkerUrl, {
  valid: [
    // ── isNavigator / isServiceWorkerContainer ─────────────────────────────
    {
      name: 'a serviceWorker field on an app config object is not the container',
      code: 'app.config.serviceWorker.register(scriptUrl);',
    },
    {
      name: 'this.serviceWorker is not navigator.serviceWorker',
      code: 'class A { m(url) { this.serviceWorker.register(url); } }',
    },
    {
      name: 'window.<anything other than navigator>.serviceWorker is not the container',
      code: 'window.app.serviceWorker.register(scriptUrl);',
    },
    {
      name: 'register on a navigator member other than serviceWorker is not a worker registration',
      code: 'navigator.credentials.register(cfg);',
    },
    {
      name: 'only register is the sink — getRegistration takes a scope, not a script',
      code: 'navigator.serviceWorker.getRegistration(scopeUrl);',
    },

    // ── containerFromBinding ────────────────────────────────────────────────
    {
      name: 'a redeclared var binding is refused',
      code: 'var sw = navigator.serviceWorker; var sw; sw.register(url);',
    },
    {
      name: 'a rest element off navigator is navigator, not its serviceWorker',
      code: 'const { ...nav } = navigator; nav.register(url);',
    },
    {
      name: 'a destructured navigator field other than serviceWorker is not the container',
      code: 'const { onLine: sw } = navigator; sw.register(url);',
    },
    {
      name: 'picking serviceWorker does not make a sibling binding the container',
      code: 'const { serviceWorker, onLine: sw } = navigator; sw.register(url);',
    },
    {
      name: 'a destructuring key computed from a variable is not provably serviceWorker',
      code: 'const { [serviceWorker]: sw } = navigator; sw.register(url);',
    },

    // ── isStaticUrlConstruction ─────────────────────────────────────────────
    {
      name: "import.meta['url'] is the same bundler anchor as import.meta.url",
      code: "navigator.serviceWorker.register(new URL('./sw.js', import.meta['url']));",
    },
  ],
  invalid: [
    {
      name: 'a function-scoped alias of navigator.serviceWorker is resolved by name',
      code: 'function reg(scriptUrl) { const sw = navigator.serviceWorker; sw.register(scriptUrl); }',
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    {
      name: 'destructuring serviceWorker alongside other navigator fields still yields the container',
      code: 'const { serviceWorker, onLine } = navigator; serviceWorker.register(url);',
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    {
      name: 'a constructor other than URL is not a static URL construction',
      code: "navigator.serviceWorker.register(new CustomUrl('./sw.js'));",
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    {
      name: 'a base read off an arbitrary object .url is not import.meta.url',
      code: "navigator.serviceWorker.register(new URL('./sw.js', config.url));",
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    {
      name: 'only import.meta.url is the anchor — another import.meta field is not',
      code: "navigator.serviceWorker.register(new URL('./sw.js', import.meta.env));",
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    {
      name: 'a static path against a remote origin base is dynamic',
      code: "navigator.serviceWorker.register(new URL('./sw.js', remote.origin));",
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    {
      name: 'a static path against an unresolved identifier base is dynamic',
      code: "navigator.serviceWorker.register(new URL('./sw.js', base));",
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
  ],
});
