/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock: no rule in this plugin reports in a file with no Vercel AI
 * SDK in it.
 *
 * Measured over 107,384 files in 107 pinned repositories, **91% of everything
 * this plugin reported (1,738 of 1,909 findings) was in a file with no `ai` /
 * `@ai-sdk` import** — `no-hardcoded-api-keys` alone contributed 782.
 *
 * Written over the whole rule registry rather than per rule, so a rule added
 * later is covered the day it lands: it will fail here until it is gated too.
 * Revert the gate in any single rule and this test goes red.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import plugin from './index';

const RULES = Object.keys(plugin.rules);

/**
 * Shapes that drew findings from this plugin across the corpus while having no
 * Vercel AI SDK in them.
 *
 * The first four are the measured reason this gate is imports-only: each calls
 * a function whose *name* the plugin keyed on, from an entirely different
 * vendor. A call-signature arm — the second arm the Express gate needed — would
 * re-admit every one of them.
 */
const NON_AI_SOURCES: ReadonlyArray<readonly [string, string]> = [
  [
    'useChat from @kapaai/react-sdk',
    `import { KapaProvider, useChat } from '@kapaai/react-sdk';
     export function Assistant() {
       const { submitQuery } = useChat();
       return submitQuery;
     }`,
  ],
  [
    'useChat from @orama/ui',
    `import { useChat } from '@orama/ui/hooks/useChat';
     export function Search() {
       const { messages } = useChat();
       return messages;
     }`,
  ],
  [
    "stream-json's StreamObject.streamObject()",
    `import StreamObject from 'stream-json/streamers/StreamObject';
     const s = StreamObject.streamObject();
     export default s;`,
  ],
  [
    'swig-email-templates generateText(path, ctx, html, cb)',
    `import templates from 'swig-email-templates';
     templates.generateText('welcome.html', { name: 'x' }, '<p>hi</p>', () => {});`,
  ],
  [
    "LangChain's IBM provider calling this.service.generateText()",
    `export class WatsonxLLM {
       async call(input: string) {
         return this.service.generateText({ input, parameters: { max_new_tokens: 50 } });
       }
     }`,
  ],
  [
    'a plain config object with an apiKey — the 782-finding shape',
    `export const config = {
       apiKey: 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz123456',
       endpoint: 'https://api.example.com',
     };`,
  ],
  [
    'a local module merely named ai',
    `import { generateText } from './ai';
     export const run = () => generateText({ prompt: 'x' });`,
  ],
];

/** A violation of every rule, keyed by rule name; each is that rule's doc ❌ example. */
const RULE_VIOLATIONS: Readonly<Record<string, string>> = {
  'no-dynamic-system-prompt': `await generateText({ system: \`You are a \${role} assistant.\`, prompt: userInput });`,
  'no-hardcoded-api-keys': `const openai = createOpenAI({ apiKey: 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz123456' });`,
  'no-sensitive-in-prompt': `await generateText({ prompt: \`Current password: \${userPassword}\` });`,
  'no-system-prompt-leak': `export function GET() {
       return Response.json({ systemPrompt: SYSTEM_PROMPT });
     }`,
  'no-training-data-exposure': `const config = { training: true };`,
  'no-unsafe-output-handling': `const result = await generateText({ prompt: 'Generate code' });
     eval(result.text);`,
  'require-abort-signal': `await streamText({ model: openai('gpt-4'), prompt: 'Stream a long response' });`,
  'require-audit-logging': `async function handler() {
       const result = await generateText({ prompt: userInput });
       return result.text;
     }`,
  'require-embedding-validation': `await vectorStore.upsert({ id: docId, embedding: await embed(text) });`,
  'require-error-handling': `async function handler() {
       const result = await generateText({ prompt: 'Hello' });
       return result.text;
     }`,
  'require-max-steps': `await generateText({ model, tools, stopWhen: hasToolCall('finalAnswer'), prompt: 'research' });`,
  'require-max-tokens': `await generateText({ model: openai('gpt-4'), prompt: 'Write a story' });`,
  'require-output-filtering': `const tools = { search: { execute: async ({ sql }) => db.query(sql) } };`,
  'require-output-validation': `display(result.text);`,
  'require-rag-content-validation': `const docs = await vectorStore.search(query);
     await generateText({ prompt: \`Based on these documents: \${docs}\` });`,
  'require-request-timeout': `await generateText({ model: openai('gpt-4'), prompt: 'Hello' });`,
  'require-tool-confirmation': `await generateText({
       model: openai('gpt-4'),
       prompt: 'Delete the temp files',
       tools: {
         deleteFile: {
           description: 'Delete a file',
           execute: async ({ path }) => fs.unlinkSync(path),
         },
       },
     });`,
  'require-tool-schema': `const tools = { weather: { execute: async (params) => getWeather(params.location) } };`,
  'require-validated-prompt': `await generateText({ prompt: req.body.question });`,
};

const lint = (code: string, rule: string): Linter.LintMessage[] => {
  // `configType: 'flat'` is explicit because the declared ESLint floor for this
  // package still defaults `new Linter()` to eslintrc, where a flat config is
  // ignored and every rule silently skipped — the vacuous pass this lock exists
  // to catch.
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: parser as unknown as Linter.Parser,
        parserOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
          ecmaFeatures: { jsx: false },
        },
      },
      plugins: { xp: plugin as unknown as Linter.Plugin },
      rules: { [`xp/${rule}`]: 'error' },
    },
    // Without a filename the Linter lints `<input>`, which matches no `files`
    // entry — so every rule is skipped and every negative below passes without
    // running a rule at all. The positive controls are what catch that.
    'route.ts',
  );
};

describe('Vercel AI module gate', () => {
  it('the registry is non-empty, so the sweep below is not vacuous', () => {
    expect(RULES.length).toBeGreaterThan(0);
  });

  describe.each(NON_AI_SOURCES)('%s', (_name, code) => {
    it.each(RULES)('xp/%s reports nothing', (rule) => {
      const messages = lint(code, rule);
      // A parse or config error also produces zero *rule* findings, so it is
      // asserted away rather than counted as a pass.
      expect(messages.filter((m) => !m.ruleId)).toHaveLength(0);
      expect(messages).toHaveLength(0);
    });
  });

  // One real violation per rule, from that rule's own doc. The sweep above
  // only proves silence; a rule whose shapes none of those sources contains
  // would pass it with its gate deleted. Each fixture here must report with the
  // SDK imported and stay silent without it, so reverting the gate in any one
  // rule turns exactly that rule's row red.
  describe.each(RULES)('xp/%s — its own violation', (rule) => {
    const code = RULE_VIOLATIONS[rule];

    it('has a fixture, so a rule added later cannot skip this lock', () => {
      expect(code).toBeTypeOf('string');
    });

    it("reports once the file imports 'ai'", () => {
      expect(lint(`import 'ai';\n${code}`, rule).length).toBeGreaterThan(0);
    });

    it('is silent with the import removed', () => {
      expect(lint(code, rule)).toHaveLength(0);
    });
  });

  describe('positive controls — the gate must open for real AI SDK code', () => {
    const hardcoded = `const config = {
      apiKey: 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz123456',
    };`;

    it("reports once the file imports 'ai'", () => {
      const code = `import { generateText } from 'ai';\n${hardcoded}`;
      expect(lint(code, 'no-hardcoded-api-keys').length).toBeGreaterThan(0);
    });

    it('reports on a scoped @ai-sdk provider import', () => {
      const code = `import { openai } from '@ai-sdk/openai';\n${hardcoded}`;
      expect(lint(code, 'no-hardcoded-api-keys').length).toBeGreaterThan(0);
    });

    it('reports on a provider the allow-list never enumerated', () => {
      // The scope is matched whole precisely so this keeps working.
      const code = `import { mistral } from '@ai-sdk/mistral';\n${hardcoded}`;
      expect(lint(code, 'no-hardcoded-api-keys').length).toBeGreaterThan(0);
    });

    it("reports on require('ai')", () => {
      const code = `const { generateText } = require('ai');\n${hardcoded}`;
      expect(lint(code, 'no-hardcoded-api-keys').length).toBeGreaterThan(0);
    });

    it("reports on a dynamic await import('ai')", () => {
      // Lazily importing the SDK inside a route handler is idiomatic in
      // serverless code, so a gate that only understood static imports would
      // abstain on exactly the files most likely to hold a key.
      const code = `export async function POST() {
        const { generateText } = await import('ai');
        return generateText;
      }
      ${hardcoded}`;
      expect(lint(code, 'no-hardcoded-api-keys').length).toBeGreaterThan(0);
    });

    it("opens on TypeScript's import-equals form", () => {
      const code = `import ai = require('ai');\n${hardcoded}`;
      expect(lint(code, 'no-hardcoded-api-keys').length).toBeGreaterThan(0);
    });

    it('opens on a deno.land/x URL import', () => {
      const code = `import { generateText } from 'https://deno.land/x/ai@v1.0.0/mod.ts';\n${hardcoded}`;
      expect(lint(code, 'no-hardcoded-api-keys').length).toBeGreaterThan(0);
    });

    it("opens on Deno's npm: specifier", () => {
      const code = `import { openai } from 'npm:@ai-sdk/openai';\n${hardcoded}`;
      expect(lint(code, 'no-hardcoded-api-keys').length).toBeGreaterThan(0);
    });

    it('and stays silent on that same config with no SDK present', () => {
      expect(lint(hardcoded, 'no-hardcoded-api-keys')).toHaveLength(0);
    });
  });

  describe('a locally bound require is not module loading', () => {
    it('does not open the gate', () => {
      const code = `function wrap(require) {
        return require('ai');
      }
      const config = { apiKey: 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz123456' };`;
      expect(lint(code, 'no-hardcoded-api-keys')).toHaveLength(0);
    });

    it('but shadowing stays lexical — a real load elsewhere still opens it', () => {
      // The file-wide-flag bug (#483) silenced the whole plugin here.
      const code = `const ai = require('ai');
      function wrap(require) { return require('x'); }
      const config = { apiKey: 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz123456' };`;
      expect(lint(code, 'no-hardcoded-api-keys').length).toBeGreaterThan(0);
    });
  });
});
