/**
 * Comprehensive tests for prefer-event-target rule
 * Prefer EventTarget over EventEmitter for cross-platform compatibility
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferEventTarget } from '../../rules/architecture/prefer-event-target';

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
  },
});

describe('prefer-event-target', () => {
  describe('Import declarations', () => {
    ruleTester.run('detect EventEmitter imports', preferEventTarget, {
      valid: [
        // Other imports from events module
        {
          code: 'import { EventTarget } from "events";',
        },
        {
          code: 'import { on } from "node:events";',
        },
        // Imports from other modules
        {
          code: 'import { Component } from "react";',
        },
        {
          code: 'import fs from "fs";',
        },
        // No EventEmitter usage
        {
          code: 'console.log("no events");',
        },
      ],
      invalid: [
        // EventEmitter from events
        {
          code: 'import { EventEmitter } from "events";',
          output: 'import { EventTarget } from "events";',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                importedName: 'EventEmitter',
                suggestion: 'Use EventTarget instead for cross-platform compatibility',
              },
            },
          ],
        },
        // EventEmitter from node:events
        {
          code: 'import { EventEmitter } from "node:events";',
          output: 'import { EventTarget } from "node:events";',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                importedName: 'EventEmitter',
                suggestion: 'Use EventTarget instead for cross-platform compatibility',
              },
            },
          ],
        },
        // EventEmitter with other imports
        {
          code: 'import { EventEmitter, EventTarget } from "events";',
          output: 'import { EventTarget, EventTarget } from "events";',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                importedName: 'EventEmitter',
                suggestion: 'Use EventTarget instead for cross-platform compatibility',
              },
            },
          ],
        },
        // EventEmitter with alias
        {
          code: 'import { EventEmitter as EE } from "events";',
          output: 'import { EventTarget as EE } from "events";',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                importedName: 'EventEmitter',
                suggestion: 'Use EventTarget instead for cross-platform compatibility',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Require calls', () => {
    ruleTester.run('detect EventEmitter from require', preferEventTarget, {
      valid: [
        // Require other things from events
        {
          code: 'const { EventTarget } = require("events");',
        },
        {
          code: 'const events = require("events"); console.log(events.on);',
        },
        // Require other modules
        {
          code: 'const fs = require("fs");',
        },
      ],
      invalid: [
        // Direct EventEmitter access
        {
          code: 'const events = require("events"); const emitter = new events.EventEmitter();',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                usage: 'events.EventEmitter',
                suggestion: 'Use EventTarget from global or events module',
              },
            },
          ],
        },
        // EventEmitter from destructuring
        {
          code: 'const { EventEmitter } = require("events"); const emitter = new EventEmitter();',
          output: 'const { EventTarget } = require("events"); const emitter = new EventEmitter();',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                usage: 'EventEmitter from require',
                suggestion: 'Use EventTarget for cross-platform compatibility',
              },
            },
          ],
        },
        // EventEmitter from node:events
        {
          code: 'const nodeEvents = require("node:events"); const emitter = new nodeEvents.EventEmitter();',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                usage: 'nodeEvents.EventEmitter',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Class inheritance', () => {
    ruleTester.run('detect EventEmitter class extension', preferEventTarget, {
      valid: [
        // Extend EventTarget
        {
          code: 'class MyEmitter extends EventTarget {}',
        },
        // Extend other classes
        {
          code: 'class MyComponent extends React.Component {}',
        },
        // No inheritance
        {
          code: 'class MyClass { constructor() {} }',
        },
      ],
      invalid: [
        // Extend EventEmitter directly
        {
          code: 'class MyEmitter extends EventEmitter {}',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                className: 'MyEmitter',
                suggestion: 'Extend EventTarget instead of EventEmitter',
              },
            },
          ],
        },
        // Extend EventEmitter from module
        {
          code: 'class MyEmitter extends events.EventEmitter {}',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                className: 'MyEmitter',
              },
            },
          ],
        },
        // Anonymous class extending EventEmitter
        {
          code: 'const MyEmitter = class extends EventEmitter {};',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                className: 'Anonymous',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Allow EventEmitter option', () => {
    ruleTester.run('allow EventEmitter when configured', preferEventTarget, {
      valid: [
        // EventEmitter imports allowed
        {
          code: 'import { EventEmitter } from "events";',
          options: [{ allowEventEmitter: true }],
        },
        {
          code: 'const { EventEmitter } = require("events");',
          options: [{ allowEventEmitter: true }],
        },
        // Class extension allowed
        {
          code: 'class MyEmitter extends EventEmitter {}',
          options: [{ allowEventEmitter: true }],
        },
        // Usage allowed
        {
          code: 'const events = require("events"); const emitter = new events.EventEmitter();',
          options: [{ allowEventEmitter: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Auto-fix capabilities', () => {
    ruleTester.run('provide auto-fixes for simple cases', preferEventTarget, {
      valid: [],
      invalid: [
        // Import specifier replacement
        {
          code: 'import { EventEmitter } from "events";',
          output: 'import { EventTarget } from "events";',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                importedName: 'EventEmitter',
                suggestion: 'Use EventTarget instead for cross-platform compatibility',
              },
            },
          ],
        },
        // Import with alias
        {
          code: 'import { EventEmitter as EE } from "events";',
          output: 'import { EventTarget as EE } from "events";',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                importedName: 'EventEmitter',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Complex usage patterns', () => {
    ruleTester.run('handle complex EventEmitter usage', preferEventTarget, {
      valid: [
        // EventEmitter in comments or strings
        {
          code: 'console.log("EventEmitter is a class");',
        },
        {
          code: '// TODO: Replace EventEmitter with EventTarget',
        },
        // Variable named EventEmitter
        {
          code: 'const EventEmitter = "not the class"; console.log(EventEmitter);',
        },
      ],
      invalid: [
        // Multiple EventEmitter usages in one file
        {
          code: `
            import { EventEmitter } from "events";
            class MyEmitter extends EventEmitter {}
            const emitter = new EventEmitter();
          `,
          output: `
            import { EventTarget } from "events";
            class MyEmitter extends EventEmitter {}
            const emitter = new EventEmitter();
          `,
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                importedName: 'EventEmitter',
                suggestion: 'Use EventTarget instead for cross-platform compatibility',
              },
            },
            {
              messageId: 'preferEventTarget',
              data: {
                className: 'MyEmitter',
                suggestion: 'Extend EventTarget instead of EventEmitter',
              },
            },
          ],
        },
        // EventEmitter with method calls
        {
          code: `
            const events = require("events");
            const emitter = new events.EventEmitter();
            emitter.on('event', () => {});
            emitter.emit('event');
          `,
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                usage: 'events.EventEmitter',
                suggestion: 'Use EventTarget for cross-platform compatibility',
              },
            },
          ],
        },
      ],
    });
  });

  describe('TypeScript support', () => {
    ruleTester.run('handle TypeScript constructs', preferEventTarget, {
      valid: [
        // TypeScript EventTarget usage
        {
          code: 'const target: EventTarget = new EventTarget();',
        },
        // TypeScript interface extension
        {
          code: 'interface MyEmitter extends EventTarget {}',
        },
        // TypeScript type annotations (EventEmitter assumed to be available globally)
        {
          code: 'const emitter: EventEmitter = new EventEmitter();',
          filename: '/src/emitter.ts',
        },
      ],
      invalid: [
        // TypeScript EventEmitter import
        {
          code: 'import { EventEmitter } from "events";',
          filename: '/src/emitter.ts',
          output: 'import { EventTarget } from "events";',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                importedName: 'EventEmitter',
                suggestion: 'Use EventTarget instead for cross-platform compatibility',
              },
            },
          ],
        },
        // TypeScript class extension
        {
          code: 'class MyEmitter extends EventEmitter implements EventTarget {}',
          filename: '/src/emitter.ts',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                className: 'MyEmitter',
                suggestion: 'Extend EventTarget instead of EventEmitter',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Suggestion capabilities', () => {
    ruleTester.run('provide helpful suggestions', preferEventTarget, {
      valid: [],
      invalid: [
        // Import with auto-fix
        {
          code: 'import { EventEmitter } from "events";',
          output: 'import { EventTarget } from "events";',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                importedName: 'EventEmitter',
                suggestion: 'Use EventTarget instead for cross-platform compatibility',
              },
            },
          ],
        },
        // Class extension
        {
          code: 'class MyEmitter extends EventEmitter {}',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                className: 'MyEmitter',
                suggestion: 'Extend EventTarget instead of EventEmitter',
              },
            },
          ],
        },
        // Require usage
        {
          code: 'const events = require("events"); const emitter = new events.EventEmitter();',
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                usage: 'events.EventEmitter',
                suggestion: 'Use EventTarget for cross-platform compatibility',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Real-world patterns', () => {
    ruleTester.run('handle real-world event emitter patterns', preferEventTarget, {
      valid: [
        // Modern EventTarget usage
        {
          code: `
            class EventManager extends EventTarget {
              dispatch(type, detail) {
                this.dispatchEvent(new CustomEvent(type, { detail }));
              }
            }
          `,
        },
        // Node.js EventEmitter allowed in specific contexts
        {
          code: `
            const EventEmitter = require('events');
            class MyEmitter extends EventEmitter {
              constructor() {
                super();
                this.on('ready', () => console.log('ready'));
              }
            }
          `,
          filename: '/src/server-only.js',
          options: [{ allowEventEmitter: true }],
        },
      ],
      invalid: [
        // Common Node.js pattern
        {
          code: `
            const EventEmitter = require('events').EventEmitter;

            class ProgressTracker extends EventEmitter {
              constructor() {
                super();
                this.progress = 0;
              }

              updateProgress(value) {
                this.progress = value;
                this.emit('progress', value);
              }
            }
          `,
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                usage: 'require("events").EventEmitter',
                suggestion: 'Use EventTarget for cross-platform compatibility',
              },
            },
            {
              messageId: 'preferEventTarget',
              data: {
                className: 'ProgressTracker',
                suggestion: 'Extend EventTarget instead of EventEmitter',
              },
            },
          ],
        },
        // Browser-compatible event handling
        {
          code: `
            import { EventEmitter } from 'events';

            export class DataLoader extends EventEmitter {
              async load(url) {
                this.emit('start');
                try {
                  const response = await fetch(url);
                  const data = await response.json();
                  this.emit('success', data);
                  return data;
                } catch (error) {
                  this.emit('error', error);
                  throw error;
                }
              }
            }
          `,
          output: `
            import { EventTarget } from 'events';

            export class DataLoader extends EventEmitter {
              async load(url) {
                this.emit('start');
                try {
                  const response = await fetch(url);
                  const data = await response.json();
                  this.emit('success', data);
                  return data;
                } catch (error) {
                  this.emit('error', error);
                  throw error;
                }
              }
            }
          `,
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                importedName: 'EventEmitter',
                suggestion: 'Use EventTarget instead for cross-platform compatibility',
              },
            },
            {
              messageId: 'preferEventTarget',
              data: {
                className: 'DataLoader',
                suggestion: 'Extend EventTarget instead of EventEmitter',
              },
            },
          ],
        },
        // Mixed import and usage
        {
          code: `
            import { EventEmitter } from 'events';
            import { EventTarget } from 'events';

            // Old pattern
            const emitter = new EventEmitter();
            emitter.on('data', () => {});

            // New pattern
            const target = new EventTarget();
            target.addEventListener('data', () => {});
          `,
          output: `
            import { EventTarget } from 'events';
            import { EventTarget } from 'events';

            // Old pattern
            const emitter = new EventEmitter();
            emitter.on('data', () => {});

            // New pattern
            const target = new EventTarget();
            target.addEventListener('data', () => {});
          `,
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                importedName: 'EventEmitter',
                suggestion: 'Use EventTarget instead for cross-platform compatibility',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('handle edge cases', preferEventTarget, {
      valid: [
        // EventEmitter as property name
        {
          code: 'const obj = { EventEmitter: true }; console.log(obj.EventEmitter);',
        },
        // EventEmitter in template literals
        {
          code: 'console.log(`Using ${"EventEmitter"}`);',
        },
        // EventEmitter in comments
        {
          code: `
            // This file uses EventEmitter for Node.js compatibility
            const target = new EventTarget();
          `,
        },
      ],
      invalid: [
        // EventEmitter in complex expressions
        {
          code: `
            const createEmitter = () => {
              return require('events').EventEmitter;
            };
            const EmitterClass = createEmitter();
          `,
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                usage: 'events.EventEmitter',
              },
            },
          ],
        },
        // EventEmitter with destructuring
        {
          code: `
            const { EventEmitter: Emitter } = require('events');
            const emitter = new Emitter();
          `,
          output: `
            const { EventTarget: Emitter } = require('events');
            const emitter = new Emitter();
          `,
          errors: [
            {
              messageId: 'preferEventTarget',
              data: {
                usage: 'EventEmitter from require',
                suggestion: 'Use EventTarget for cross-platform compatibility',
              },
            },
          ],
        },
      ],
    });
  });
});
