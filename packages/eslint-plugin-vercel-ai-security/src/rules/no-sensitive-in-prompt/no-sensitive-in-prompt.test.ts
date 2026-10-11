/**
 * @fileoverview Tests for no-sensitive-in-prompt rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSensitiveInPrompt } from './index';

/**
 * Every fixture imports the AI SDK, because the rules now abstain in files with
 * no `ai` / `@ai-sdk` in them. Wrapping the arrays rather than editing each
 * fixture means one cannot be left behind — a fixture missing the import would
 * pass vacuously on the gate instead of exercising the detection it was written
 * for. `output` and errors[].suggestions[].output are prefixed too, since
 * autofix fixtures assert the whole file back.
 */
// A SIDE-EFFECT import: it satisfies the gate without reserving any binding,
// so fixtures that already declare `generateText`/`openai` do not redeclare.
const asAi = (code: string): string => `import 'ai';\n${code}`;
type AiSuggestion = { output?: string | null };
type AiCase = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly AiSuggestion[] } | string>;
};
const xai = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asAi(c) as T;
    const test = c as AiCase;
    return {
      ...c,
      code: asAi(test.code),
      ...(typeof test.output === 'string' ? { output: asAi(test.output) } : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asAi(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-sensitive-in-prompt', noSensitiveInPrompt, {
  valid: xai([
    // Safe: no sensitive data
    {
      name: 'ordinary user input',
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: safeUserInput,
        });
      `,
    },
    // Safe: static prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello, how can I help you?',
        });
      `,
    },
    // Safe: validated user input
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: validateInput(userMessage),
        });
      `,
    },
    // Safe: non-sensitive variable
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          prompt: userName,
        });
      `,
    },
    // Safe: user question
    {
      code: `
        await generateObject({
          model: openai('gpt-4'),
          prompt: \`Answer this question: \${userQuestion}\`,
          schema: z.object({ answer: z.string() }),
        });
      `,
    },
    // Not an AI function
    {
      code: `
        await someFunction({
          prompt: userPassword,
        });
      `,
    },
    // No prompt property
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
        });
      `,
    },
    // Non-object argument
    {
      code: `
        await generateText(options);
      `,
    },
    // Non-matching property
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          other: userPassword,
        });
      `,
    },
  ]),

  invalid: xai([
    // Password in prompt
    {
      name: 'a password sent to the provider as prompt text',
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: userPassword,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // API key in prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: \`Use this key: \${apiKey}\`,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Secret in system prompt
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          system: \`Secret context: \${clientSecret}\`,
          prompt: 'Hello',
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Credit card in prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: creditCardNumber,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Token in prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: accessToken,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // SSN in prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: userSsn,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Member expression with sensitive property
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: user.password,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Private key in template
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          prompt: \`Sign with: \${privateKey}\`,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Database password
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: dbPassword,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Binary expression with sensitive data
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Context: ' + userPassword,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Nested binary expression
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: prefix + userSecret + suffix,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Coverage-gap fixtures: key shapes, member/binary edge branches
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-sensitive-in-prompt (coverage gaps)', noSensitiveInPrompt, {
  valid: xai([
    // spread-only options object
    { code: `generateText({ ...opts });` },
    // computed key — the name genuinely isn't statically known
    { code: `generateText({ [k]: password });` },
    // (Moved 2026-10-10) `user['password']` is the same property as
    // `user.password`; it used to be skipped and is now in the audit invalid suite.
    // computed member access with a runtime key names no property
    { code: `generateText({ prompt: user[field] });` },
    // member access to a non-sensitive property
    { code: `generateText({ prompt: user.displayName });` },
    // concatenation of two non-sensitive operands
    { code: `generateText({ prompt: 'a' + 'b' });` },
  ]),
  invalid: xai([
    // sensitive value on the right side of concatenation
    {
      code: `generateText({ prompt: 'user data: ' + password });`,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// AI SDK v7 renamed the system prompt to `instructions` (`system` is deprecated
// in the SDK's own types). Regression lock: the props set used to carry `system`
// only, so secrets interpolated into `instructions` went unreported.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-sensitive-in-prompt (instructions prop)', noSensitiveInPrompt, {
  valid: xai([]),
  invalid: xai([
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          instructions: \`Use this key: \${apiKey}\`,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
  ]),
});

// Quoted keys are the same property as bare ones — `{ "instructions": x }` must
// be read like `{ instructions: x }`, or a secret slips through on formatting alone.
ruleTester.run('no-sensitive-in-prompt (quoted key)', noSensitiveInPrompt, {
  valid: xai([]),
  invalid: xai([
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          "instructions": \`Use this key: \${apiKey}\`,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
  ]),
});

// Computed key whose variable is named exactly like the property. The existing
// computed-key fixture uses `[k]`, which never collided and so never caught the
// bug: `{ [instructions]: … }` was read as the literal `instructions`.
ruleTester.run('no-sensitive-in-prompt (computed key collision)', noSensitiveInPrompt, {
  valid: xai([
    {
      code: `
        const instructions = 'temperature';
        generateText({ model, [instructions]: apiKey });
      `,
    },
  ]),
  invalid: xai([]),
});

// ─────────────────────────────────────────────────────────────────────────────
// FP/FN audit 2026-10-10: whole-word name matching (`businessName` has no
// `ssn` word; `maxTokens` is a count of tokens, not a token), and the v5 chat
// shape — `messages: [...]` — is searched too.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-sensitive-in-prompt (fp-fn audit)', noSensitiveInPrompt, {
  valid: xai([
    {
      name: '"businessName" contains the letters s-s-n, not the word ssn',
      code: `await generateText({ model, prompt: \`Write a tagline for \${biz.businessName}, a \${biz.industry} company.\` });`,
    },
    {
      name: 'token COUNTS are not tokens',
      code: `
        const maxTokens = 200;
        await generateText({ model, prompt: \`Summarize in under \${maxTokens} tokens.\` });
        await generateText({ model, prompt: \`Explain why this run used \${usage.totalTokens} tokens.\` });
      `,
    },
    {
      name: 'a messages array with no sensitive values',
      code: `await streamText({ model, messages: [...history, { ...base, role: 'user', content: question }, , ] });`,
    },
  ]),
  invalid: xai([
    {
      name: 'a password interpolated into a chat message',
      code: `
        await streamText({
          model,
          messages: [...history, { role: 'user', content: \`My login is \${user.email} / \${user.password}\` }],
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    {
      name: 'secrets spread into the messages array',
      code: `await streamText({ model, messages: [...secretNotes] });`,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    {
      name: 'a bracketed property is the same property',
      code: `generateText({ prompt: user['password'] });`,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Zero-deferral pass 2026-10-11: a WHOLE object embedded in a prompt —
// JSON.stringify(x), String(x) or `${x}` — is reported when x resolves, in the
// same file, to an object literal with a sensitive key or to a full DB row.
// Property names describe the data; variable names are not consulted.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-sensitive-in-prompt (whole records)', noSensitiveInPrompt, {
  valid: xai([
    {
      // guard reasoned from F-11b: an explicit projection names its columns
      name: 'guard: a Prisma row fetched with an explicit select',
      code: `
        import { PrismaClient } from '@prisma/client';
        const prisma = new PrismaClient();
        const foo = await prisma.user.findUnique({ where: { id }, select: { name: true, plan: true } });
        await generateText({ model, prompt: \`Greet: \${JSON.stringify(foo)}\` });
      `,
    },
    {
      // guard reasoned from F-11b: an object literal with no sensitive key
      name: 'guard: an object literal with only harmless keys',
      code: `
        const foo = { name, plan, locale: 'en' };
        await generateText({ model, prompt: JSON.stringify(foo) });
      `,
    },
    {
      // guard reasoned from F-11b: chat history loaded from the DB is the conversation, not a record dump
      name: 'guard: chat history rows spread into messages',
      code: `
        import { PrismaClient } from '@prisma/client';
        const prisma = new PrismaClient();
        const foo = await prisma.message.findMany({ where: { chatId } });
        await streamText({ model, messages: [...foo, { role: 'user', content: question }] });
      `,
    },
    {
      name: 'projections and non-database handles are not full rows',
      code: `
        import { drizzle } from 'drizzle-orm/node-postgres';
        import knex from 'knex';
        const db = drizzle(pool);
        const shared = globalThis.db;
        const a = await db.select({ name: users.name }).from(users);
        const b = await knex('users').select('name', 'plan');
        const c = await shared.user.findMany();
        const d = await notADb.query();
        await generateText({ model, prompt: JSON.stringify(a) + JSON.stringify(b) });
        await generateText({ model, prompt: JSON.stringify(c) + JSON.stringify(d) + String() });
      `,
    },
    {
      // guard reasoned from F-11b: a column list is a projection
      name: 'guard: a pg query with an explicit column list',
      code: `
        import { Pool } from 'pg';
        const pool = new Pool();
        const { rows: [foo] } = await pool.query('SELECT name, plan FROM users WHERE id = $1', [id]);
        await generateText({ model, prompt: \`User: \${JSON.stringify(foo)}\` });
      `,
    },
  ]),
  invalid: xai([
    {
      // @found reasoned from F-11b: the same full-row read through other database clients
      name: 'FN: full rows from drizzle, knex and a mysql2 connection serialised into prompts',
      code: `
        import { drizzle } from 'drizzle-orm/node-postgres';
        import knex from 'knex';
        import mysql from 'mysql2/promise';
        const db = drizzle(pool);
        const conn = await mysql.createConnection(url);
        const a = await db.select().from(users);
        const b = await knex('users').where({ id }).select('*');
        const [c] = await conn.query('SELECT * FROM users');
        await generateText({ model, prompt: JSON.stringify(a) });
        await generateText({ model, prompt: JSON.stringify(b) });
        await generateText({ model, prompt: JSON.stringify(c) });
      `,
      errors: [
        { messageId: 'sensitiveInPrompt' },
        { messageId: 'sensitiveInPrompt' },
        { messageId: 'sensitiveInPrompt' },
      ],
    },
    {
      // @found F-11b, harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-vercel-ai-security.md)
      name: 'FN: a whole Prisma user row serialised into the prompt',
      code: `
        import { PrismaClient } from '@prisma/client';
        const prisma = new PrismaClient();
        const foo = await prisma.user.findUnique({ where: { id } });
        await generateText({ model, prompt: \`Personalize a greeting for: \${JSON.stringify(foo)}\` });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    {
      // @found reasoned from F-11b: the pg SELECT-star row shape
      name: 'FN: a SELECT * row interpolated into the system prompt',
      code: `
        import { Pool } from 'pg';
        const pool = new Pool();
        const { rows: [foo] } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        await generateText({ model, system: \`Account: \${foo}\`, prompt: 'hi' });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    {
      // @found reasoned from F-11b: an object literal whose key names a secret
      name: 'FN: an object literal with a password key serialised into a message',
      code: `
        const foo = { email, password: input.password };
        await streamText({ model, messages: [{ role: 'user', content: String(foo) }] });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
  ]),
});
