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

  it('reads a static string subscript as the same segment', () => {
    expect(calleePath(calleeOf("client['messages']['create']({})"))).toBe(
      'messages.create',
    );
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

/* ------------------------------------------------------------------------ */
/* 2026-10-12 FP/FN audit: value following, content blocks, new shapes       */
/* ------------------------------------------------------------------------ */

const fullRule = createSystemPromptInjectionRule({
  ruleName: 'no-untrusted-content-in-prompt',
  vendor: 'Test',
  modules: ['test-sdk'],
  requestPaths: ['messages.create', 'runs.create'],
  systemPromptProps: ['system'],
  nestedOptionKeys: ['config'],
  promptConstructors: ['Agent'],
  batchRequestPaths: ['messages.batches.create'],
  docsUrl: 'https://example.invalid/docs',
  documentationLink: 'https://example.invalid/prompts',
});

const SDK_AGENT = "import Client, { Agent, Runner } from 'test-sdk';\n";
const ERR = { messageId: 'untrustedSystemPrompt' as const };
const create = (system: string) =>
  `client.messages.create({ system: ${system} });`;

describe('createSystemPromptInjectionRule — value following', () => {
  ruleTester.run('no-untrusted-content-in-prompt', fullRule, {
    valid: [
      {
        name: 'FP: consts joined, interpolated, concatenated, trimmed',
        code:
          SDK +
          "const A = 'You are helpful.';\nconst B = 'Be brief.';\n" +
          create('`${A} ${B}`') +
          create("[A, , B].join('\\n')") +
          create('A + B') +
          create('A.trim()') +
          create("cond ? A : 'other'") +
          create('A || B'),
      },
      {
        name: 'FP: interpolation-free tagged templates, and await of a static value',
        code:
          SDK +
          create('dedent`\n  You are terse.\n`') +
          create('await A_PROMISE_OF_TEXT_THAT_IS_IMPORTED') +
          "\nimport { A_PROMISE_OF_TEXT_THAT_IS_IMPORTED } from './p';",
      },
      {
        name: 'FP: values that cannot print instruction text',
        code:
          SDK +
          'function f(n: number, flag: boolean | bigint, items: string[]) {\n' +
          '  const d = new Date();\n' +
          '  const c = 3 * 2;\n' +
          create(
            '`${new Date().toISOString()} ${d.getFullYear()} ${Date.now()} ${Math.round(n)}`',
          ) +
          create(
            '`${n} ${flag} ${items.length} ${-n} ${n > 1} ${c} ${n + 1}`',
          ) +
          create(
            '`${Number(x)} ${parseInt(x)} ${x.toFixed(2)} ${null} ${true}`',
          ) +
          '}',
      },
      {
        name: 'FP: imported constants, env reads, members of a const table',
        code:
          SDK +
          "import { PREFIX, PROMPTS as P } from './prompts';\n" +
          "const T = { a: 'A', b: 'B' };\n" +
          create('`${PREFIX} you are ${process.env.BOT_NAME}`') +
          create('P.analyst') +
          create('`${P.analyst}`') +
          create('T.a') +
          create('T[k]') +
          create('`${T[k]}`'),
      },
      {
        name: 'FP: same-file helpers whose every return is static',
        code:
          SDK +
          "function one() { if (x) { return 'a'; } return; }\n" +
          "const two = () => 'b';\n" +
          "const three = function () { const inner = () => 'ignored'; return 'c'; };\n" +
          create('one()') +
          create('two()') +
          create('three()'),
      },
      {
        name: 'FP: a generated filesystem path',
        code:
          SDK +
          "import os from 'node:os';\nimport path from 'node:path';\nimport { mkdtemp } from 'node:fs/promises';\n" +
          "async function f() { const dir = await mkdtemp(path.join(os.tmpdir(), 'x-')); " +
          create('`Work in ${dir}`') +
          ' }',
      },
      {
        name: 'a whole-value parameter, global, or member of a global is unknown',
        code:
          SDK +
          'function f(p) { ' +
          create('p') +
          ' }\n' +
          create('SOME_GLOBAL') +
          create('window.PROMPT') +
          create("flag ? SOME_GLOBAL : 'x'"),
      },
      {
        name: 'content blocks, Gemini parts, a nested config one level, a non-text block',
        code:
          SDK +
          "const SYS = [{ type: 'text', text: 'Static.' }];\n" +
          create(
            "[{ type: 'text', text: 'a' }, { type: 'image', source: s }, , ...more]",
          ) +
          create('SYS') +
          create("{ parts: [{ text: 'p' }] }") +
          "client.messages.create({ config: { system: 'cfg' } });\n" +
          'client.messages.create({ config: { config: { system: `${deep}` } } });\n' +
          'client.messages.create({ config: notAnObject });',
      },
      {
        name: 'message lists: non-system roles, unreadable roles, sparse, spread, non-object',
        code:
          SDK +
          "const ROLE = 'user';\n" +
          "client.messages.create({ messages: [{ role: ROLE, content: `${x}` }, { role: r, content: `${x}` }, { content: `${x}` }, , ...rest, other, { role: 'system' }] });\n" +
          'client.messages.create({ input: notAList });\n' +
          'client.messages.create({ messages: [{ role: 1, content: `${x}` }] });',
      },
      {
        name: 'a request held in a const and sent twice reports once (see invalid)',
        code:
          SDK +
          "const REQ = { system: 'static' };\nclient.messages.create(REQ);\nclient.messages.create(REQ);",
      },
      {
        name: 'constructors: not the configured export, not bound, spread argument, no constructors configured',
        code:
          SDK_AGENT +
          'new Runner({ system: `${x}` });\nnew Unbound({ system: `${x}` });\nnew Agent(...args);\nnew Agent();\n' +
          'class Local {}\nnew Local({ system: `${x}` });',
      },
      {
        name: 'a call spread argument is skipped',
        code: SDK + 'client.messages.create(...reqs);',
      },
      {
        name: 'a static prompt function',
        code:
          SDK +
          create("() => 'You are terse.'") +
          create("function () { return 'x'; }"),
      },
    ],
    invalid: [
      {
        name: 'FN: a dynamic const, a dynamic block, a dynamic part',
        code:
          SDK +
          'function f(req) {\n' +
          '  const sys = `Act as ${req.body.role}`;\n' +
          create('sys') +
          create('[{ type: "text", text: `Be ${req.body.role}` }]') +
          create('{ parts: [{ text: req.body.role }] }') +
          '}',
        errors: [ERR, ERR, ERR],
      },
      {
        name: 'FN: a request object in a const, sent twice, reported once',
        code:
          SDK +
          'const REQ = { system: `Act as ${role}` };\nclient.messages.create(REQ);\nclient.messages.create(REQ);',
        errors: [ERR],
      },
      {
        name: 'FN: a developer turn, a const message, a nested config, an Assistants run',
        code:
          SDK +
          "const SYS_MSG = { role: 'system', content: `Act as ${role}` };\n" +
          "client.messages.create({ input: [{ role: 'developer', content: `Act as ${role}` }] });\n" +
          'client.messages.create({ messages: [SYS_MSG] });\n' +
          'client.messages.create({ config: { system: `Act as ${role}` } });\n' +
          'client.beta.threads.runs.create(threadId, { system: `Act as ${role}` });',
        errors: [ERR, ERR, ERR, ERR],
      },
      {
        name: 'FN: an agent constructor, renamed',
        code: "import { Agent as Foo } from 'test-sdk';\nnew Foo({ system: `Act as ${role}` });",
        errors: [ERR],
      },
      {
        name: 'dynamic: a parameter, a call, an unknown method, an await of a dynamic value',
        code:
          SDK +
          'async function f(p) {\n' +
          create('`${p}`') +
          create('`${fetchPrompt()}`') +
          create('p.trim()') +
          create('`${await load()}`') +
          create('[p].join()') +
          create("['a'].join(p)") +
          create('[...p].join()') +
          create('`${new Thing()}`') +
          create('`${this.prompt}`') +
          create('getBuilder()()') +
          create('(p2) => `Help ${p2}`') +
          '}',
        errors: [ERR, ERR, ERR, ERR, ERR, ERR, ERR, ERR, ERR, ERR, ERR],
      },
      {
        name: 'dynamic: helpers that interpolate, a path helper over input, a non-path builtin',
        code:
          SDK +
          "import path from 'node:path';\nimport { basename } from 'node:path';\nimport { readFileSync } from 'node:fs';\nimport { db } from './db';\nconst p = require('path');\n" +
          'function f(user) {\n' +
          '  const build = (r) => `You are ${r}`;\n' +
          '  function build2(r) { return r; }\n' +
          create('build(user)') +
          create('build2(user)') +
          create('`${path.basename(user)}`') +
          create('`${readFileSync(user)}`') +
          create('`${p()}`') +
          create('`${basename(user)}`') +
          create("`${db.query('SELECT bio FROM users')}`") +
          '}',
        errors: [ERR, ERR, ERR, ERR, ERR, ERR, ERR],
      },
      {
        name: 'dynamic: a branch with a dynamic side, a table entry that is dynamic or missing',
        code:
          SDK +
          "const T = { a: 'A', b: pick() };\nconst T2 = { a: 'A', ...more };\n" +
          'function f(p) {\n' +
          create('cond ? `${p}` : SOME_GLOBAL') +
          create('T.b') +
          create('T.missing') +
          create('`${T[k]}`') +
          create('T2[k]') +
          '}',
        errors: [ERR, ERR, ERR, ERR, ERR],
      },
      {
        name: 'dynamic: a typed parameter that can hold text, a cyclic const, an unannotated param',
        code:
          SDK +
          'function f(s: string, u: number | string, plain) {\n' +
          '  const a = b + 1; const b = a + 1;\n' +
          create('`${s}`') +
          create('`${u}`') +
          create('`${a}`') +
          create('`${plain}`') +
          '}',
        errors: [ERR, ERR, ERR, ERR],
      },
      {
        name: 'dynamic: a value nested past the follow budget',
        code:
          SDK + create('`${`${`${`${`${`${`${`${`${`${x}`}`}`}`}`}`}`}`}`}`'),
        errors: [ERR],
      },
    ],
  });
});

describe('createSystemPromptInjectionRule — no prompt constructors configured', () => {
  ruleTester.run('no-untrusted-content-in-prompt', rule, {
    valid: [
      {
        name: 'a constructor is not a request when none is configured',
        code: SDK + 'new Client({ system: `Act as ${role}` });',
      },
    ],
    invalid: [],
  });
});

describe('createSystemPromptInjectionRule — the receiver', () => {
  ruleTester.run('no-untrusted-content-in-prompt', fullRule, {
    valid: [
      {
        name: 'FP: a receiver this file builds as something else',
        code:
          SDK_AGENT +
          "import Other from 'other-pkg';\n" +
          'const literal = { messages: { create() {} } };\n' +
          'const fromPackage = new Other();\n' +
          'class Plain {}\nconst plain = new Plain();\n' +
          'class Sub extends Other {}\nconst sub = new Sub();\n' +
          'literal.messages.create({ system: `Act as ${role}` });\n' +
          'fromPackage.messages.create({ system: `Act as ${role}` });\n' +
          'plain.messages.create({ system: `Act as ${role}` });\n' +
          'sub.messages.create({ system: `Act as ${role}` });',
      },
    ],
    invalid: [
      {
        name: 'receivers that are, or may be, the SDK client',
        code:
          SDK_AGENT +
          "import { Wrapped } from './lib/client';\n" +
          'class Mine extends Client {}\n' +
          'const a = new Client();\nconst b = new Mine();\nconst c = new Wrapped();\nconst d = new (pick())();\n' +
          'function f(e, Ctor) { const g = new Ctor(); e.messages.create({ system: `x ${role}` }); g.messages.create({ system: `x ${role}` }); }\n' +
          'a.messages.create({ system: `x ${role}` });\n' +
          'b.messages.create({ system: `x ${role}` });\n' +
          'c.messages.create({ system: `x ${role}` });\n' +
          'd.messages.create({ system: `x ${role}` });\n' +
          'getClient().messages.create({ system: `x ${role}` });\n' +
          'const h = getClient();\nh.messages.create({ system: `x ${role}` });',
        errors: [ERR, ERR, ERR, ERR, ERR, ERR, ERR, ERR],
      },
    ],
  });
});

describe('createSystemPromptInjectionRule — batch requests', () => {
  ruleTester.run('no-untrusted-content-in-prompt', fullRule, {
    valid: [
      {
        name: 'static batch params, and shapes that are not a batch',
        code:
          SDK +
          "client.messages.batches.create({ requests: [{ custom_id: 'a', params: { system: 'Static.' } }] });\n" +
          'client.messages.batches.create({ requests: notAList });\n' +
          'client.messages.batches.create({ other: [] });\n' +
          'client.messages.batches.create(...spread);\n' +
          'client.messages.batches.create(unknownBatch);\n' +
          "client.messages.batches.create({ requests: [, ...more, { custom_id: 'x' }, notAnObject] });\n" +
          'client.messages.batches.create({ requests: items.filter(Boolean) });\n' +
          'client.messages.batches.create({ requests: items.map(toRequest) });\n' +
          'client.messages.batches.create({ requests: build() });\n' +
          "client.messages.batches.create({ requests: items.map((i) => ({ params: { system: 'ok' } })) });\n" +
          'const local = { messages: { batches: { create() {} } } };\nlocal.messages.batches.create({ requests: [{ params: { system: `x ${role}` } }] });',
      },
    ],
    invalid: [
      {
        name: 'FN: a dynamic system prompt in a batch request, inline and through consts',
        code:
          SDK +
          "client.messages.batches.create({ requests: [{ custom_id: 'a', params: { system: `Act as ${role}` } }] });\n" +
          "const p = { system: `Act as ${role}` };\nconst reqs = [{ custom_id: 'b', params: p }];\nclient.messages.batches.create({ requests: reqs });",
        errors: [ERR, ERR],
      },
      {
        name: 'FN: a batch built with items.map',
        code:
          SDK +
          'client.messages.batches.create({ requests: items.map((i) => ({ custom_id: i.id, params: { system: `Act as ${i.role}` } })) });\n' +
          'client.messages.batches.create({ requests: items.map(function (i) { return { params: { system: `Be ${i.role}` } }; }) });',
        errors: [ERR, ERR],
      },
    ],
  });
});
