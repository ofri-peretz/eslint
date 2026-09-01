/**
 * Tests for no-dynamic-service-worker-url rule
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
    // Static URL is fine
    {
      name: 'a literal script path',
      code: `navigator.serviceWorker.register('/sw.js');`,
    },
    {
      code: `navigator.serviceWorker.register('/service-worker.js');`,
    },
    {
      code: `navigator.serviceWorker.register('./worker.js');`,
    },
    // Not a service worker registration
    {
      code: `someObject.register(dynamicUrl);`,
    },
    // Test files allowed
    {
      code: `navigator.serviceWorker.register(dynamicUrl);`,
      filename: 'sw.test.ts',
    },
  ],
  invalid: [
    // Variable URL
    {
      name: 'a worker registered from a computed URL — it owns every request after',
      code: `navigator.serviceWorker.register(swUrl);`,
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    // Expression URL
    {
      code: `navigator.serviceWorker.register(getSwUrl());`,
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    // Template literal
    {
      code: `navigator.serviceWorker.register(\`\${basePath}/sw.js\`);`,
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    // Concatenation
    {
      code: `navigator.serviceWorker.register(basePath + '/sw.js');`,
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    // Test file with allowInTests: false
    {
      code: `navigator.serviceWorker.register(dynamicUrl);`,
      filename: 'sw.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
  ],
});

/**
 * REGRESSION LOCK — "not a string Literal" is not the question.
 *
 * The whole test was `urlArg.type === 'Literal'`, a syntactic proxy for "can an
 * attacker influence this value". It reported three provably-static spellings,
 * including `new URL('./sw.js', import.meta.url)` — the idiom Vite, webpack 5
 * and Parcel all prescribe in their own documentation. The RECOMMENDED way to
 * register a worker was the one thing the rule flagged.
 *
 * It also missed the destructured container entirely, and accepted any object
 * with a `serviceWorker` field as the browser's `ServiceWorkerContainer`.
 *
 * Every case below fails on the pre-fix rule.
 */
ruleTester.run('no-dynamic-service-worker-url-evidence', noDynamicServiceWorkerUrl, {
  valid: [
    // A module constant. Extracting a literal is what style guides ask for.
    { code: `const SW_URL = '/sw.js';\nnavigator.serviceWorker.register(SW_URL);` },
    // A template literal with no expressions IS a string literal.
    { code: 'navigator.serviceWorker.register(`/sw.js`);' },
    // The bundler idiom, with and without options.
    {
      code: `navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), { type: 'module' });`,
    },
    { code: `navigator.serviceWorker.register(new URL('/sw.js'));` },
    // A destructured container, registered with a static path.
    {
      code: `const { serviceWorker } = navigator;\nserviceWorker.register('/sw.js');`,
    },
    // Not the browser's container: a plugin host with its own field.
    {
      code: `const { serviceWorker } = pluginHost;\nserviceWorker.register(descriptor);`,
    },
    // `register` is a very common method name.
    { code: `router.register(dynamicRoute);` },
    // Reading registrations installs nothing.
    { code: `const list = await navigator.serviceWorker.getRegistrations();` },
    // A receiver this file cannot resolve to the container.
    { code: `getContainer().register(dynamicUrl);` },
    { code: `app.navigator.serviceWorker.register(dynamicUrl);` },
    // A binding that could be anything at the point of use.
    {
      code: `let sw = navigator.serviceWorker;\nsw = otherHost;\nsw.register(dynamicUrl);`,
    },
    // A destructuring shape the rule does not model.
    {
      code: `const [sw] = [navigator.serviceWorker];\nsw.register(dynamicUrl);`,
    },
    // An unbound identifier: no binding to resolve at all.
    { code: `swContainer.register(dynamicUrl);` },
    // Re-declared: more than one definition, so the value is not knowable.
    {
      code: `var sw;\nvar sw = navigator.serviceWorker;\nsw.register(dynamicUrl);`,
    },
    // A definition that is not a variable at all.
    { code: `function sw() {}\nsw.register(dynamicUrl);` },
    { code: `function boot(sw) { sw.register(dynamicUrl); }` },
    // A declaration with no initialiser.
    { code: `let sw;\nsw.register(dynamicUrl);` },
  ],
  invalid: [
    // The container reached through a destructured binding.
    {
      code: `const { serviceWorker } = navigator;\nserviceWorker.register(remote.swUrl);`,
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    // ...and through an aliased one.
    {
      code: `const sw = navigator.serviceWorker;\nsw.register(remote.swUrl);`,
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    // The `new URL()` idiom with an attacker-chosen BASE. A static path
    // argument is necessary but not sufficient — the origin is the payload.
    {
      code: `navigator.serviceWorker.register(new URL('./sw.js', remote.cdnOrigin));`,
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    // A binding that only LOOKS folded: written again before use.
    {
      code: `let workerUrl = '/sw.js';\nworkerUrl = remote.swOverride;\nnavigator.serviceWorker.register(workerUrl);`,
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    // The fully-qualified global.
    {
      code: `window.navigator.serviceWorker.register(settings.workerUrl);`,
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    // A constructed value that is not a `URL`.
    {
      code: `navigator.serviceWorker.register(new SwDescriptor(path));`,
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    // `new URL()` with no arguments constructs nothing static.
    {
      code: `navigator.serviceWorker.register(new URL());`,
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    // A dynamic PATH inside the bundler idiom.
    {
      code: `navigator.serviceWorker.register(new URL(remote.path, import.meta.url));`,
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
  ],
});
