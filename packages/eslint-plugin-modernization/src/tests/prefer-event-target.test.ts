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
});
