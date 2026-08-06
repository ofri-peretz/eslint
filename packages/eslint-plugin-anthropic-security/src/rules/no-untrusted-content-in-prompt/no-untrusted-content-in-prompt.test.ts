/**
 * Tests for anthropic-security/no-untrusted-content-in-prompt (CWE-1427).
 *
 * The load-bearing valid case is the bare-function one: `generateText(...)`
 * belongs to eslint-plugin-vercel-ai-security. If this rule ever fires there,
 * one line carries a finding from two plugins and the taxonomy contract breaks.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noUntrustedContentInPrompt } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { ecmaVersion: 2022, sourceType: 'module' } },
});

const SDK = "import Anthropic from '@anthropic-ai/sdk';\n";

describe('no-untrusted-content-in-prompt', () => {
  ruleTester.run('no-untrusted-content-in-prompt', noUntrustedContentInPrompt, {
    valid: [
      {
        name: 'a dynamic prompt in a file that never imports the SDK',
        code: 'client.messages.create({ system: `Act as ${role}.` });',
      },
      {
        name: 'a static system prompt',
        code: SDK + "client.messages.create({ system: 'You are a helpful assistant.' });",
      },
      {
        name: 'a constant reference is the correct pattern',
        code: SDK + 'client.messages.create({ system: SYSTEM_PROMPT });',
      },
      {
        // THE boundary case. vercel-ai-security owns the bare-function form.
        name: 'the Vercel AI SDK shape belongs to another plugin',
        code: SDK + 'generateText({ system: `Act as ${role}.` });',
      },
      {
        // The remediation this rule recommends.
        name: 'runtime values in a user turn are data, not instructions',
        code:
          SDK +
          "client.messages.create({ system: 'You are helpful.', messages: [{ role: 'user', content: `${input}` }] });",
      },
      {
        name: 'a method outside this SDK request path',
        code: SDK + 'client.batches.create({ system: `Act as ${role}.` });',
      },
    ],
    invalid: [
      {
        name: 'an interpolated system prompt',
        code: SDK + 'client.messages.create({ system: `Act as ${role}.` });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'a concatenated system prompt',
        code: SDK + "client.messages.create({ system: 'Act as ' + role });",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'a system prompt built by a call',
        code: SDK + 'client.messages.create({ system: buildPrompt(user) });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        // The second registered request path. Streaming takes the same options
        // and carries the same risk, so it is locked separately.
        name: 'messages.stream carries the same injection',
        code: SDK + 'client.messages.stream({ system: `Act as ${role}.` });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
    ],
  });
});
