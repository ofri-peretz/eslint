/**
 * Tests for prefer-event-target rule
 * Prefer EventTarget over EventEmitter
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
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('prefer-event-target', () => {
  describe('import detection', () => {
    ruleTester.run('detect EventEmitter import', preferEventTarget, {
      valid: [
        // EventTarget is fine
        { code: 'class MyEmitter extends EventTarget {}' },
        // Allow when option is set
        {
          code: 'import { EventEmitter } from "events";',
          options: [{ allowEventEmitter: true }],
        },
        // Other imports are fine
        { code: 'import { readFile } from "fs";' },
      ],
      invalid: [
        // Import from events module
        {
          code: 'import { EventEmitter } from "events";',
          output: 'import { EventTarget } from "events";',
          errors: [{ messageId: 'preferEventTarget' }],
        },
        // Import from node:events
        {
          code: 'import { EventEmitter } from "node:events";',
          output: 'import { EventTarget } from "node:events";',
          errors: [{ messageId: 'preferEventTarget' }],
        },
      ],
    });
  });

  describe('class extends detection', () => {
    ruleTester.run('detect EventEmitter class extension', preferEventTarget, {
      valid: [
        // Extending EventTarget is fine
        { code: 'class MyEmitter extends EventTarget {}' },
        // Extending other classes is fine
        { code: 'class MyError extends Error {}' },
      ],
      invalid: [
        // Class extending EventEmitter
        {
          code: 'class MyEmitter extends EventEmitter {}',
          errors: [{ messageId: 'preferEventTarget' }],
        },
      ],
    });
  });

  describe('require detection', () => {
    ruleTester.run('detect EventEmitter require', preferEventTarget, {
      valid: [
        // Allow when option is set
        {
          code: 'const { EventEmitter } = require("events");',
          options: [{ allowEventEmitter: true }],
        },
      ],
      invalid: [
        // Destructuring require
        {
          code: 'const { EventEmitter } = require("events");',
          output: 'const { EventTarget } = require("events");',
          errors: [{ messageId: 'preferEventTarget' }],
        },
      ],
    });
  });

  describe('MemberExpression detection', () => {
    ruleTester.run('detect require().EventEmitter', preferEventTarget, {
      valid: [
        // Not events module
        { code: 'const x = require("http").Server;' },
      ],
      invalid: [
        // require('events').EventEmitter
        {
          code: 'const emitter = new (require("events").EventEmitter)();',
          errors: [{ messageId: 'preferEventTarget' }],
        },
        // require('node:events').EventEmitter
        {
          code: 'const emitter = new (require("node:events").EventEmitter)();',
          errors: [{ messageId: 'preferEventTarget' }],
        },
        // Variable access: events.EventEmitter
        {
          code: 'const emitter = new events.EventEmitter();',
          errors: [{ messageId: 'preferEventTarget' }],
        },
        // nodeEvents.EventEmitter
        {
          code: 'const emitter = new nodeEvents.EventEmitter();',
          errors: [{ messageId: 'preferEventTarget' }],
        },
      ],
    });
  });

  describe('ClassExpression extends', () => {
    ruleTester.run('detect ClassExpression extends EventEmitter', preferEventTarget, {
      valid: [
        // ClassExpression extending EventTarget is fine
        { code: 'const MyEmitter = class extends EventTarget {};' },
      ],
      invalid: [
        // ClassExpression extending EventEmitter
        {
          code: 'const MyEmitter = class extends EventEmitter {};',
          errors: [{ messageId: 'preferEventTarget' }],
        },
        // ClassExpression extending events.EventEmitter (MemberExpression superclass)
        // Rule fires on both MemberExpression and class-extends visitors
        {
          code: 'const MyEmitter = class extends events.EventEmitter {};',
          errors: [{ messageId: 'preferEventTarget' }, { messageId: 'preferEventTarget' }],
        },
      ],
    });
  });

  describe('require with node:events', () => {
    ruleTester.run('detect node:events require', preferEventTarget, {
      valid: [],
      invalid: [
        // Destructuring require from node:events
        {
          code: 'const { EventEmitter } = require("node:events");',
          output: 'const { EventTarget } = require("node:events");',
          errors: [{ messageId: 'preferEventTarget' }],
        },
      ],
    });
  });
});
