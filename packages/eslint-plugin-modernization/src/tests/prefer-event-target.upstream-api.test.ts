/**
 * `prefer-event-target` advises on code that RUNS. Three places carry the word
 * `EventEmitter` without choosing it, found linting vite and nest:
 *
 * - `*.d.ts` and `import type`: a declaration describing an upstream API
 *   (vite's `chokidar.d.ts`: `class FSWatcher extends EventEmitter`, `ws.d.ts`).
 *   The author of the declaration cannot migrate the library it describes.
 * - test files: nest's specs build a fake `EventEmitter` as a stream double
 *   (30 of its 33 findings).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferEventTarget } from '../rules/prefer-event-target';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('prefer-event-target - upstream API declarations and tests', () => {
  ruleTester.run('declarations and tests are not advised', preferEventTarget, {
    valid: [
      {
        // vite packages/vite/src/types/chokidar.d.ts
        name: 'an ambient class extending EventEmitter in a .d.ts describes the library',
        code: "import type { EventEmitter } from 'node:events'\nexport class FSWatcher extends EventEmitter {}",
        filename: 'chokidar.d.ts',
      },
      {
        name: 'a value import of EventEmitter in a .d.mts file',
        code: "import { EventEmitter } from 'node:events'\nexport declare class Server extends EventEmitter {}",
        filename: 'ws.d.mts',
      },
      {
        name: 'import type never reaches runtime, even in a .ts file',
        code: "import type { EventEmitter } from 'node:events'\nexport interface Watcher extends EventEmitter {}\nexport declare const w: EventEmitter",
        filename: 'types.ts',
      },
      {
        name: 'inline type specifier never reaches runtime',
        code: "import { type EventEmitter } from 'node:events'\nexport declare const w: EventEmitter",
        filename: 'types.ts',
      },
      {
        // nest packages/core/test/router/router-response-controller.spec.ts
        name: 'a spec file builds an EventEmitter double',
        code: "import { EventEmitter } from 'events'\nconst stream = new EventEmitter()",
        filename: 'router-response-controller.spec.ts',
      },
      {
        name: 'a .test.mts file builds an EventEmitter double',
        code: "const { EventEmitter } = require('events')\nclass Fake extends EventEmitter {}",
        filename: 'fake.test.mts',
      },
    ],
    invalid: [
      {
        name: 'a value import in ordinary source still reports',
        code: "import { EventEmitter } from 'events'",
        filename: 'client-nats.ts',
        errors: [{ messageId: 'preferEventTarget' }],
      },
      {
        name: 'a class extending EventEmitter in a plain .ts file still reports',
        code: "import { EventEmitter } from 'node:events'\nexport class Bus extends EventEmitter {}",
        filename: 'bus.ts',
        errors: [{ messageId: 'preferEventTarget' }],
      },
      {
        name: 'a file merely named like a declaration is source, not a declaration',
        code: "import { EventEmitter } from 'events'",
        filename: 'd.ts.ts',
        errors: [{ messageId: 'preferEventTarget' }],
      },
      {
        name: 'a directory named test does not exempt a source file',
        code: "import { EventEmitter } from 'events'",
        filename: 'test/bus.ts',
        errors: [{ messageId: 'preferEventTarget' }],
      },
    ],
  });
});
