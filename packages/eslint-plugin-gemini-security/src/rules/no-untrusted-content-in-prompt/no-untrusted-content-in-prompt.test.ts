/**
 * Tests for gemini-security/no-untrusted-content-in-prompt (CWE-1427).
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
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const SDK = "import { GoogleGenAI } from '@google/genai';\n";
const LEGACY = "import { GoogleGenerativeAI } from '@google/generative-ai';\n";

describe('no-untrusted-content-in-prompt', () => {
  ruleTester.run('no-untrusted-content-in-prompt', noUntrustedContentInPrompt, {
    valid: [
      {
        name: 'a dynamic prompt in a file that never imports the SDK',
        code: 'ai.models.generateContent({ systemInstruction: `Act as ${role}.` });',
      },
      {
        name: 'a static system prompt',
        code:
          SDK +
          "ai.models.generateContent({ systemInstruction: 'You are a helpful assistant.' });",
      },
      {
        name: 'a constant reference is the correct pattern',
        code:
          SDK +
          'ai.models.generateContent({ systemInstruction: SYSTEM_PROMPT });',
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
          "ai.models.generateContent({ systemInstruction: 'You are helpful.', messages: [{ role: 'user', content: `${input}` }] });",
      },
      {
        name: 'a method outside this SDK request path',
        code:
          SDK +
          'ai.models.embedContent({ systemInstruction: `Act as ${role}.` });',
      },
      // FP (2026-10-12)
      {
        name: 'guard: a date in the system instruction',
        code:
          SDK +
          'ai.models.generateContent({ model: "m", contents: "x", config: { systemInstruction: `Today is ${new Date().toDateString()}` } });',
      },
      {
        name: 'a static instruction under config, as the SDK sample writes it',
        code:
          SDK +
          "ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'high', config: { systemInstruction: 'I say high you say low.' } });",
      },
      {
        name: 'config is read one level deep, not recursively',
        code:
          SDK +
          'ai.models.generateContent({ config: { config: { systemInstruction: `Act as ${role}.` } } });',
      },
    ],
    invalid: [
      {
        name: 'an interpolated system prompt',
        code:
          SDK +
          'ai.models.generateContent({ systemInstruction: `Act as ${role}.` });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'a concatenated system prompt',
        code:
          SDK +
          "ai.models.generateContent({ systemInstruction: 'Act as ' + role });",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'a system prompt built by a call',
        code:
          SDK +
          'ai.models.generateContent({ systemInstruction: buildPrompt(user) });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        // The second registered request path — same options, same risk.
        name: 'generateContentStream carries the same injection',
        code:
          SDK +
          'ai.models.generateContentStream({ systemInstruction: `Act as ${role}.` });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        // Gemini's nested instruction shape, locked per-plugin as well as in
        // the devkit factory.
        name: 'the nested parts shape',
        code:
          SDK +
          'ai.models.generateContent({ systemInstruction: { parts: [{ text: `Act as ${role}.` }] } });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      // FN (2026-10-12): `@google/genai` puts the instruction under `config`,
      // and `@google/generative-ai` fixes it when the model is made.
      {
        name: 'FN: systemInstruction under config (the current SDK)',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-gemini-security.md)
        code:
          SDK +
          'ai.models.generateContent({ model: "m", contents: q, config: { systemInstruction: `You are ${persona}` } });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'FN: a chat, a cached context and a Live session',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-gemini-security.md)
        code:
          SDK +
          'ai.chats.create({ model: "m", config: { systemInstruction: `You are ${persona}` } });\n' +
          'ai.caches.create({ model: "m", config: { systemInstruction: `You are ${persona}` } });\n' +
          'ai.live.connect({ model: "m", config: { systemInstruction: `You are ${persona}` }, callbacks: {} });',
        errors: [
          { messageId: 'untrustedSystemPrompt' },
          { messageId: 'untrustedSystemPrompt' },
          { messageId: 'untrustedSystemPrompt' },
        ],
      },
      {
        name: 'FN: the legacy SDK sets it on getGenerativeModel and startChat',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-gemini-security.md)
        code:
          LEGACY +
          'const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: `You are ${persona}` });\n' +
          "model.startChat({ systemInstruction: { role: 'system', parts: [{ text: `Be ${persona}` }] } });",
        errors: [
          { messageId: 'untrustedSystemPrompt' },
          { messageId: 'untrustedSystemPrompt' },
        ],
      },
      {
        name: 'FN: the config object held in a const',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-gemini-security.md)
        code:
          SDK +
          'const cfg = { systemInstruction: `You are ${persona}` };\nai.models.generateContent({ model: "m", contents: "x", config: cfg });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'FN: a per-message config on a chat',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-gemini-security.md)
        code:
          SDK +
          'chat.sendMessage({ message: q, config: { systemInstruction: `You are ${persona}` } });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
    ],
  });
});
