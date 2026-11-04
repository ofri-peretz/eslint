/**
 * @fileoverview Tests for no-verbose-error-messages
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noVerboseErrorMessages } from '../../rules/operability/no-verbose-error-messages';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-verbose-error-messages', noVerboseErrorMessages, {
  valid: [
    // Safe error responses
    { name: 'a generic message leaks nothing', code: "res.send('Error occurred')" },
    { code: "res.json({ error: 'Internal error' })" },
    { code: "res.json({ message: 'Something went wrong' })" },
    // Non-response calls
    { code: 'console.log(error.stack)' },
    { code: 'logger.error(err.stack)' },
  ],

  invalid: [
    // Exposing stack directly
    {
      name: 'a stack trace in the response body leaks internals',
      code: 'res.send(error.stack)',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'res.json(err.stack)',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Exposing stack in object
    {
      code: 'res.json({ stack: error.stack })',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'res.send({ error: err.stack })',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// Found by the fidelity model (benchmarks/suites/fidelity/models/operability):
// the rule matched the KEY name `stack`, so a stack under another key, in a
// template or through a const was missed, and `stack: 'hidden'` reported.
ruleTester.run('no-verbose-error-messages — follows the stack, not the key name', noVerboseErrorMessages, {
  valid: [
    {
      name: 'a key named stack with a literal value leaks nothing',
      code: "res.json({ error: 'Internal error', stack: 'hidden' });",
    },
    {
      name: 'an unknown payload is not a finding',
      code: 'function send(res: any, payload: unknown) { res.json(payload); }',
    },
    {
      name: "spread does not copy an Error's non-enumerable stack",
      code: 'function send(res: any, err: Error) { res.json({ ...err }); }',
    },
    {
      name: 'nesting deeper than the bounded walk is not followed',
      code: 'function send(res: any, err: Error) { res.json({ a: { b: { c: { d: { e: { stack: err.stack } } } } } }); }',
    },
    {
      name: 'a stack in the second argument is not the body',
      code: 'function send(res: any, err: Error) { res.send("failed", err.stack); }',
    },
  ],
  invalid: [
    {
      name: 'quoted key',
      code: "function send(res: any, err: Error) { res.json({ 'stack': err.stack }); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'nested object',
      code: 'function send(res: any, err: Error) { res.json({ error: { stack: err.stack } }); }',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'through a const',
      code: 'function send(res: any, err: Error) { const trace = err.stack; res.send(trace); }',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'destructured out of the error',
      code: 'function send(res: any, err: Error) { const { stack } = err; res.send(stack); }',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'renamed with a default in the pattern',
      code: "function send(res: any, err: Error) { const { stack: s = '' } = err; res.send(s); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'template literal',
      code: 'function send(res: any, err: Error) { res.send(`Failed: ${err.stack}`); }',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'string concatenation',
      code: "function send(res: any, err: Error) { res.send('Failed: ' + err.stack); }",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
