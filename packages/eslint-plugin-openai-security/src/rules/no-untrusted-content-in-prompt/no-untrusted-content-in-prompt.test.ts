/**
 * Tests for openai-security/no-untrusted-content-in-prompt (CWE-1427).
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

const SDK = "import OpenAI from 'openai';\n";

describe('no-untrusted-content-in-prompt', () => {
  ruleTester.run('no-untrusted-content-in-prompt', noUntrustedContentInPrompt, {
    valid: [
      {
        name: 'a dynamic prompt in a file that never imports the SDK',
        code: 'client.responses.create({ instructions: `Act as ${role}.` });',
      },
      {
        name: 'a static system prompt',
        code: SDK + "client.responses.create({ instructions: 'You are a helpful assistant.' });",
      },
      {
        name: 'a constant reference is the correct pattern',
        code: SDK + 'client.responses.create({ instructions: SYSTEM_PROMPT });',
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
          "client.responses.create({ instructions: 'You are helpful.', messages: [{ role: 'user', content: `${input}` }] });",
      },
      {
        name: 'a method outside this SDK request path',
        code: SDK + 'client.threads.create({ instructions: `Act as ${role}.` });',
      },
      {
        name: 'a static system turn on Chat Completions',
        code:
          SDK +
          "client.chat.completions.create({ messages: [{ role: 'system', content: 'You are helpful.' }] });",
      },
    ],
    invalid: [
      {
        name: 'an interpolated system prompt',
        code: SDK + 'client.responses.create({ instructions: `Act as ${role}.` });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'a concatenated system prompt',
        code: SDK + "client.responses.create({ instructions: 'Act as ' + role });",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'a system prompt built by a call',
        code: SDK + 'client.responses.create({ instructions: buildPrompt(user) });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        // Chat Completions is the most-used OpenAI shape, and it carries the
        // system prompt as a message rather than as a named option. Locked
        // here so a `requestPaths` edit cannot drop it silently.
        name: 'an interpolated system turn on Chat Completions',
        code:
          SDK +
          "client.chat.completions.create({ messages: [{ role: 'system', content: `Act as ${role}.` }] });",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
    ],
  });
});
