/**
 * Tests for createSystemPromptInjectionRule.
 *
 * Layer 2: the decision helpers directly.
 * Layer 1: the assembled rule against a synthetic SDK, covering both shapes a
 * raw SDK uses — a named option and a `messages: [{ role: 'system' }]` array.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  createSystemPromptInjectionRule,
  isStaticInstruction,
  staticKey,
  isSystemMessage,
  messageContent,
  calleePath,
} from './system-prompt-injection-rule';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const exprOf = (code: string): TSESTree.Node =>
  (parser.parse(code, { range: true }).body[0] as TSESTree.ExpressionStatement)
    .expression;

const propOf = (code: string): TSESTree.Node =>
  (exprOf(code) as TSESTree.ObjectExpression).properties[0]!;

describe('isStaticInstruction', () => {
  it('accepts a literal, an interpolation-free template, and concatenations of them', () => {
    expect(isStaticInstruction(exprOf("'You are a helpful assistant.'"))).toBe(
      true,
    );
    expect(isStaticInstruction(exprOf('`You are helpful.`'))).toBe(true);
    expect(isStaticInstruction(exprOf("'a' + 'b'"))).toBe(true);
    expect(isStaticInstruction(exprOf("'a' + `b`"))).toBe(true);
  });

  it('accepts a bare identifier — the const-above-the-call pattern', () => {
    // Deliberate. `const SYSTEM = '…'` is the correct shape and by far the most
    // common; following it is the data-flow analysis this rule avoids, and
    // reporting every `system: SYSTEM_PROMPT` would make the rule unusable.
    expect(isStaticInstruction(exprOf('SYSTEM_PROMPT'))).toBe(true);
  });

  it('rejects anything that can carry content from elsewhere', () => {
    expect(isStaticInstruction(exprOf('`You are ${role}.`'))).toBe(false);
    expect(isStaticInstruction(exprOf("'You are ' + role"))).toBe(false);
    expect(isStaticInstruction(exprOf('buildPrompt()'))).toBe(false);
    expect(isStaticInstruction(exprOf('await loadPrompt()'))).toBe(false);
    expect(isStaticInstruction(exprOf('a.b'))).toBe(false);
  });

  it('rejects a non-string literal', () => {
    expect(isStaticInstruction(exprOf('42'))).toBe(false);
  });

  it('rejects a concatenation with one dynamic half', () => {
    expect(isStaticInstruction(exprOf("'You are ' + get()"))).toBe(false);
    expect(isStaticInstruction(exprOf("get() + ' helpful'"))).toBe(false);
  });
});

describe('staticKey', () => {
  it('reads bare and quoted keys alike', () => {
    expect(staticKey(propOf('({ system: 1 })'))).toBe('system');
    expect(staticKey(propOf("({ 'system': 1 })"))).toBe('system');
  });

  it('returns undefined for a computed key or a spread', () => {
    expect(staticKey(propOf('({ [k]: 1 })'))).toBeUndefined();
    expect(staticKey(propOf('({ ...base })'))).toBeUndefined();
  });

  it('returns undefined for a non-string literal key', () => {
    // `{ 1: x }` is a valid property whose name is not a string node.
    expect(staticKey(propOf('({ 1: x })'))).toBeUndefined();
  });
});

describe('isSystemMessage', () => {
  it('matches only a literal system role', () => {
    expect(isSystemMessage(exprOf("({ role: 'system', content: 'x' })"))).toBe(
      true,
    );
    expect(isSystemMessage(exprOf("({ role: 'user', content: 'x' })"))).toBe(
      false,
    );
    // A user turn is *supposed* to carry untrusted content; guessing at a
    // non-literal role would report it.
    expect(isSystemMessage(exprOf("({ role: someRole, content: 'x' })"))).toBe(
      false,
    );
    expect(isSystemMessage(exprOf("({ content: 'x' })"))).toBe(false);
  });

  it('is false for a non-object', () => {
    expect(isSystemMessage(exprOf("'not an object'"))).toBe(false);
  });
});

describe('messageContent', () => {
  it('finds the content value', () => {
    const node = exprOf(
      "({ role: 'system', content: 'hello' })",
    ) as TSESTree.ObjectExpression;
    expect(messageContent(node)?.type).toBe('Literal');
  });

  it('returns undefined when there is no content key', () => {
    const node = exprOf("({ role: 'system' })") as TSESTree.ObjectExpression;
    expect(messageContent(node)).toBeUndefined();
  });
});

describe('calleePath', () => {
  const calleeOf = (code: string): TSESTree.Node =>
    (
      (
        parser.parse(code, { range: true })
          .body[0] as TSESTree.ExpressionStatement
      ).expression as TSESTree.CallExpression
    ).callee;

  it('joins the member path, excluding the root object', () => {
    expect(calleePath(calleeOf('client.chat.completions.create({})'))).toBe(
      'chat.completions.create',
    );
    expect(calleePath(calleeOf('model.generateContent({})'))).toBe(
      'generateContent',
    );
  });

  it('returns undefined for a bare call — the shape another plugin owns', () => {
    expect(calleePath(calleeOf('generateText({})'))).toBeUndefined();
  });

  it('returns undefined when any segment is computed or not an identifier', () => {
    expect(calleePath(calleeOf('client[api].create({})'))).toBeUndefined();
  });

  it('handles a call as the root object', () => {
    expect(calleePath(calleeOf('getClient().messages.create({})'))).toBe(
      'messages.create',
    );
  });
});

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const rule = createSystemPromptInjectionRule({
  ruleName: 'no-untrusted-content-in-prompt',
  vendor: 'Test',
  modules: ['test-sdk'],
  requestPaths: ['messages.create', 'responses.create', 'generateContent'],
  systemPromptProps: ['system', 'instructions'],
  docsUrl: 'https://example.invalid/docs',
  documentationLink: 'https://example.invalid/prompts',
});

const SDK = "import Client from 'test-sdk';\n";

describe('createSystemPromptInjectionRule', () => {
  ruleTester.run('no-untrusted-content-in-prompt', rule, {
    valid: [
      {
        name: 'no SDK import, no opinion',
        code: 'client.messages.create({ system: `You are ${role}.` });',
      },
      {
        name: 'a static system prompt',
        code: SDK + "client.messages.create({ system: 'You are helpful.' });",
      },
      {
        name: 'a constant reference',
        code: SDK + 'client.messages.create({ system: SYSTEM_PROMPT });',
      },
      {
        name: 'an interpolation-free template',
        code: SDK + 'client.messages.create({ system: `You are helpful.` });',
      },
      {
        // The remediation this rule recommends: runtime values go in the user
        // turn, where the model reads them as data.
        name: 'interpolation in a user message is the correct pattern',
        code:
          SDK +
          "client.messages.create({ system: 'You are helpful.', messages: [{ role: 'user', content: `${input}` }] });",
      },
      {
        name: 'a non-system role is not this rule',
        code:
          SDK +
          "client.messages.create({ messages: [{ role: 'assistant', content: `${x}` }] });",
      },
      {
        name: 'a role that is not statically known',
        code:
          SDK +
          'client.messages.create({ messages: [{ role: r, content: `${x}` }] });',
      },
      {
        name: 'a system message with no content key',
        code:
          SDK + "client.messages.create({ messages: [{ role: 'system' }] });",
      },
      {
        // The shape vercel-ai-security owns. A bare call is never a member
        // call, so this rule must stay silent on it even with the SDK imported.
        name: 'a bare function call belongs to another plugin',
        code: SDK + 'generateText({ system: `You are ${role}.` });',
      },
      {
        name: 'a method this SDK does not use for requests',
        code: SDK + 'client.messages.list({ system: `You are ${role}.` });',
      },
      {
        name: 'a computed method name',
        code: SDK + 'client.messages[method]({ system: `You are ${role}.` });',
      },
      {
        // The path must match, not just the leaf. `create` alone is shared by
        // every SDK in this family, and matching it made one line report twice.
        name: 'the right leaf under the wrong path',
        code: SDK + 'client.threads.create({ system: `You are ${role}.` });',
      },
      {
        name: 'a non-object request',
        code: SDK + 'client.messages.create(payload);',
      },
      {
        name: 'no arguments at all',
        code: SDK + 'client.messages.create();',
      },
      {
        name: 'a computed key in the request',
        code: SDK + 'client.messages.create({ [k]: `${x}` });',
      },
      {
        name: 'messages that is not an array',
        code: SDK + 'client.messages.create({ messages: payload });',
      },
      {
        name: 'a sparse messages array',
        code: SDK + 'client.messages.create({ messages: [, ] });',
      },
      {
        name: 'a non-object element in messages',
        code: SDK + "client.messages.create({ messages: ['raw'] });",
      },
      {
        name: 'an unrelated option carrying interpolation',
        code: SDK + 'client.messages.create({ model: `gpt-${version}` });',
      },
      {
        // An import that is not this SDK must not open the gate.
        name: 'an unrelated import leaves the rule closed',
        code: "import { z } from 'zod';\nclient.messages.create({ system: `You are ${role}.` });",
      },
      {
        name: 'a parts value that is not an array',
        code: SDK + 'client.generateContent({ system: { parts: payload } });',
      },
      {
        name: 'a sparse parts array',
        code: SDK + 'client.generateContent({ system: { parts: [, ] } });',
      },
      {
        name: 'a nested object with neither text nor parts',
        code: SDK + 'client.generateContent({ system: { role: `${x}` } });',
      },
    ],
    invalid: [
      {
        name: 'an interpolated system prompt',
        code: SDK + 'client.messages.create({ system: `You are ${role}.` });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'a concatenated system prompt',
        code: SDK + "client.messages.create({ system: 'You are ' + role });",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'a system prompt built by a call',
        code: SDK + 'client.messages.create({ system: buildPrompt(user) });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'the instructions option',
        code:
          SDK + 'client.responses.create({ instructions: `Act as ${role}.` });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'a system turn in the messages array',
        code:
          SDK +
          "client.messages.create({ messages: [{ role: 'system', content: `${policy}` }] });",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'a quoted system role and key',
        code:
          SDK +
          "client.messages.create({ messages: [{ 'role': 'system', 'content': `${policy}` }] });",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'the nested parts shape',
        code:
          SDK +
          'client.generateContent({ system: { parts: [{ text: `You are ${role}.` }] } });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'require() opens the same gate',
        code:
          "const Client = require('test-sdk');\n" +
          'client.messages.create({ system: `You are ${role}.` });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        // The gate must not depend on statement order.
        name: 'a request above its import',
        code:
          'client.messages.create({ system: `You are ${role}.` });\n' +
          "import Client from 'test-sdk';",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'two system turns report separately',
        code:
          SDK +
          "client.messages.create({ messages: [{ role: 'system', content: `${a}` }, { role: 'system', content: `${b}` }] });",
        errors: [
          { messageId: 'untrustedSystemPrompt' },
          { messageId: 'untrustedSystemPrompt' },
        ],
      },
    ],
  });
});
