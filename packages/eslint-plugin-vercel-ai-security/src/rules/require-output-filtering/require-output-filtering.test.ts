/**
 * @fileoverview Tests for require-output-filtering rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireOutputFiltering } from './index';

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

ruleTester.run('require-output-filtering', requireOutputFiltering, {
  valid: xai([
    // Filtered database query
    {
      name: 'the result is filtered first',
      code: `
        const tools = {
          search: {
            execute: async ({ query }) => filterSensitive(db.query(query)),
          },
        };
      `,
    },
    // Static return
    {
      code: `
        const tools = {
          ping: {
            execute: async () => ({ status: 'ok' }),
          },
        };
      `,
    },
    // Sanitized fetch
    {
      code: `
        const tools = {
          getData: {
            execute: async ({ id }) => sanitize(await fetchData(id)),
          },
        };
      `,
    },
    // Not an execute function
    {
      code: `
        const handler = {
          process: async () => db.query('SELECT * FROM users'),
        };
      `,
    },
    // (Moved 2026-10-10 from invalid) `fetchData(url)` — a bare helper whose
    // NAME starts with fetch says nothing about what it returns; the same
    // substring rule flagged the canonical `getWeather(city)` tool.
    {
      name: 'a bare helper named fetch* is not a data source',
      code: `
        const tools = {
          loadData: {
            execute: async ({ url }) => fetchData(url),
          },
        };
      `,
    },
    // Non-data-source call
    {
      code: `
        const tools = {
          calculate: {
            execute: async ({ x, y }) => add(x, y),
          },
        };
      `,
    },
  ]),

  invalid: xai([
    // Direct database query return
    {
      name: 'a tool returns the raw query result to the model',
      code: `
        const tools = {
          search: {
            execute: async ({ sql }) => db.query(sql),
          },
        };
      `,
      errors: [{ messageId: 'missingOutputFilter' }],
    },
    // Direct find call
    {
      code: `
        const tools = {
          getUser: {
            execute: async ({ id }) => users.findById(id),
          },
        };
      `,
      errors: [{ messageId: 'missingOutputFilter' }],
    },
    // Select query
    {
      code: `
        const tools = {
          query: {
            execute: async ({ table }) => prisma.select(table),
          },
        };
      `,
      errors: [{ messageId: 'missingOutputFilter' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// FP/FN audit 2026-10-10: a data source is a member call on a data-access
// object or method (`db.user.findUnique`, `supabase.from().select`), matched by
// whole word; a block-bodied or method-form execute is checked too.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-output-filtering (fp-fn audit)', requireOutputFiltering, {
  valid: xai([
    {
      name: 'the canonical weather tool',
      code: `const weather = tool({ inputSchema, execute: async ({ city }) => getWeather(city) });`,
    },
    {
      name: "the AI SDK RAG guide's getInformation tool",
      code: `const tools = { getInformation: tool({ inputSchema, execute: async ({ question }) => findRelevantContent(question) }) };`,
    },
    {
      name: 'a member call that is not data access',
      code: `const t = tool({ inputSchema, execute: async ({ city }) => weatherApi.getForecast(city) });`,
    },
    {
      name: 'a block body returning a computed value',
      code: `
        const t = tool({ inputSchema, execute: async ({ id }) => {
          const n = count + 1;
          return n;
        } });
      `,
    },
    {
      name: 'a filtered result in a block body',
      code: `
        const t = tool({ inputSchema, async execute({ id }) {
          return redactUser(await db.user.findUnique({ where: { id } }));
        } });
      `,
    },
    {
      name: 'a return inside a nested callback is not the tool result',
      code: `
        const t = tool({ inputSchema, execute: async ({ ids }) => {
          ids.forEach((id) => { return db.user.findUnique({ where: { id } }); });
          return { ok: true };
        } });
      `,
    },
  ]),
  invalid: xai([
    {
      name: 'a block body returning the full user row',
      code: `
        const lookupUser = tool({
          inputSchema,
          execute: async ({ id }) => { const u = await db.user.findUnique({ where: { id } }); return u; },
        });
      `,
      errors: [{ messageId: 'missingOutputFilter' }],
    },
    {
      name: 'a method-form execute returning a query result directly',
      code: `
        const tools = { search: tool({ inputSchema, async execute({ q }) { return await supabase.from('users').select('*'); } }) };
      `,
      errors: [{ messageId: 'missingOutputFilter' }],
    },
  ]),
});
