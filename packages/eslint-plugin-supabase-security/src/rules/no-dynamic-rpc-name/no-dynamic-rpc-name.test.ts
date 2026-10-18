/**
 * @fileoverview Tests for no-dynamic-rpc-name
 *
 * Coverage intent: the fixed-string branches, the gate, and every early return —
 * plus the repo's litmus, that renaming every identifier changes nothing, since
 * the rule keys on the `.rpc` member and the argument's node type.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as tsParser from '@typescript-eslint/parser';

import { noDynamicRpcName } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const IMPORT = `import { createClient } from '@supabase/supabase-js';`;

ruleTester.run('no-dynamic-rpc-name', noDynamicRpcName, {
  valid: [
    {
      name: 'a literal name',
      code: `${IMPORT}\nawait db.rpc('get_profile', { id });`,
    },
    {
      name: 'a template literal with no interpolation is just as fixed',
      code: `${IMPORT}\nawait db.rpc(\`get_profile\`, { id });`,
    },
    { name: 'no arguments at all', code: `${IMPORT}\nawait db.rpc();` },
    {
      name: 'a spread is unreadable from here, not evidence',
      code: `${IMPORT}\nawait db.rpc(...args);`,
    },
    {
      name: 'a computed member is not `.rpc`',
      code: `${IMPORT}\nawait db[method]('x');`,
    },
    {
      name: 'a different method',
      code: `${IMPORT}\nawait db.from(table).select();`,
    },
    {
      name: 'a bare call, no member expression',
      code: `${IMPORT}\nrpc(whatever);`,
    },
    {
      name: 'no Supabase import — `.rpc` belongs to something else',
      code: `await db.rpc(name);`,
    },
    /*
     * FP-7 (2026-10-12 FP/FN audit): a name the file pins to a closed set is
     * not chosen by the caller. The rule follows it (bounded, same file).
     */
    {
      name: 'FP: a ternary between two literal function names',
      // @found supabase/supabase:packages/ai-commands/src/docs.ts:74
      code: `${IMPORT}\nconst searchFunction = options?.useAltSearchIndex ? 'match_page_sections_v2_nimbus' : 'match_page_sections_v2';\nawait supabaseClient.rpc(searchFunction, { embedding });`,
    },
    {
      name: 'FP: a lookup in a const table of literal names',
      // @found supabase/supabase:apps/www/scripts/generate-state-of-startups-data.ts:159
      code: `${IMPORT}\nconst RPC = { single: 'get_single_select_stats', multi: 'get_multi_select_stats', boolean: 'get_boolean_stats' };\nclient.rpc(RPC[t.aggregation], { survey_year: year });\nclient.rpc(RPC.single);`,
    },
    {
      name: 'FP: a template over a numeric const',
      // @found quint: benchmarks/quint/models/supabase-security.no-dynamic-rpc-name.qnt (TemplateFixed, every client)
      code: `${IMPORT}\nconst V = 2;\nawait db.rpc(\`get_stats_v\${V}\`);\nawait db.rpc(\`get_stats_\${true}\`);`,
    },
    {
      name: 'FP: a const name and a template over fixed parts',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-supabase-security.md)
      code: `${IMPORT}\nconst FN = 'get_stats';\nconst V = 2;\nawait db.rpc(FN);\nawait db.rpc(\`get_stats_v\${V === 2 ? '2' : '1'}\`);`,
    },
  ],
  invalid: [
    {
      name: 'an identifier chooses the function',
      code: `${IMPORT}\nawait db.rpc(name, args);`,
      errors: [{ messageId: 'dynamicRpcName' }],
    },
    {
      name: 'an interpolated template chooses it too',
      code: `${IMPORT}\nawait db.rpc(\`get_\${kind}\`, args);`,
      errors: [{ messageId: 'dynamicRpcName' }],
    },
    {
      name: 'a non-string literal is not a function name',
      code: `${IMPORT}\nawait db.rpc(42);`,
      errors: [{ messageId: 'dynamicRpcName' }],
    },
    {
      name: 'still fires with every identifier renamed to foo and bar',
      code: `import { foo } from '@supabase/supabase-js';\nconst bar = foo();\nawait bar.rpc(baz);`,
      errors: [{ messageId: 'dynamicRpcName' }],
    },
    {
      name: 'a request field chooses the function',
      code: `${IMPORT}\nexport async function handler(req) { return db.rpc(req.query.fn); }`,
      errors: [{ messageId: 'dynamicRpcName' }],
    },
    {
      name: 'a let reassigned from the request is not followed',
      code: `${IMPORT}\nexport async function handler(req) { let fn = 'x'; fn = req.query.fn; return db.rpc(fn); }`,
      errors: [{ messageId: 'dynamicRpcName' }],
    },
    {
      name: 'a const table with one computed entry',
      code: `${IMPORT}\nconst RPC = { a: 'get_a', b: pick() };\ndb.rpc(RPC[k]);\ndb.rpc(RPC.b);\ndb.rpc(RPC.c);`,
      errors: [
        { messageId: 'dynamicRpcName' },
        { messageId: 'dynamicRpcName' },
        { messageId: 'dynamicRpcName' },
      ],
    },
    {
      name: 'a table with a spread entry is not a closed set',
      code: `${IMPORT}\nconst RPC = { a: 'get_a', ...more };\ndb.rpc(RPC[k]);`,
      errors: [{ messageId: 'dynamicRpcName' }],
    },
    {
      name: 'a closed set nested past the follow budget is not proven',
      code: `${IMPORT}\ndb.rpc(a ? 'x' : b ? 'x' : c ? 'x' : d ? 'x' : e ? 'x' : f ? 'x' : g ? 'x' : h ? 'x' : i ? 'x' : 'y');`,
      errors: [{ messageId: 'dynamicRpcName' }],
    },
    {
      name: 'a ternary with one open branch',
      code: `${IMPORT}\ndb.rpc(alt ? 'get_a' : name);`,
      errors: [{ messageId: 'dynamicRpcName' }],
    },
  ],
});

const tsRuleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

tsRuleTester.run('no-dynamic-rpc-name (TypeScript)', noDynamicRpcName, {
  valid: [
    {
      name: "FP: the rule doc's own former known limitation — an as-const allowlist",
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-supabase-security.md)
      code: `${IMPORT}\nconst FN = { profile: 'get_user_profile' } as const;\nexport async function f(kind: keyof typeof FN, id: string) { const fn = FN[kind]; await db.rpc(fn, { id }); }`,
    },
    {
      name: 'FP: a parameter typed as a union of literal names',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-supabase-security.md)
      code: `${IMPORT}\nexport async function run(name: 'get_a' | 'get_b') { return db.rpc(name); }`,
    },
    {
      name: 'FP: a parameter typed through a same-file literal-union alias',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-supabase-security.md)
      code: `${IMPORT}\ntype Fn = 'get_a' | 'get_b';\ntype Alias = Fn;\nexport async function run(name: Alias) { return db.rpc(name); }`,
    },
  ],
  invalid: [
    {
      name: 'a parameter typed string — the caller decides',
      // @found supabase/supabase:apps/www/components/SurveyResults/SurveyChart.tsx:125
      code: `${IMPORT}\nexport function useSurveyData(isInView: boolean, functionName: string) {\n  return externalSupabase.rpc(functionName, {});\n}`,
      errors: [{ messageId: 'dynamicRpcName' }],
    },
    {
      name: 'a union that admits a non-literal',
      code: `${IMPORT}\nexport function run(name: 'get_a' | string, n: 1 | 2, other: Record<string, string>) { db.rpc(name); db.rpc(n); db.rpc(other); }`,
      errors: [
        { messageId: 'dynamicRpcName' },
        { messageId: 'dynamicRpcName' },
        { messageId: 'dynamicRpcName' },
      ],
    },
    {
      name: 'an alias chain past the follow budget is not proven',
      code: `${IMPORT}\ntype A0 = 'x';\ntype A1 = A0;\ntype A2 = A1;\ntype A3 = A2;\ntype A4 = A3;\ntype A5 = A4;\ntype A6 = A5;\ntype A7 = A6;\ntype A8 = A7;\nexport function run(name: A8) { db.rpc(name); }`,
      errors: [{ messageId: 'dynamicRpcName' }],
    },
    {
      name: 'an unannotated parameter, and a reference to an interface',
      code: `${IMPORT}\ninterface Fn { x: string }\nexport function run(a, b: Fn, c: Missing) { db.rpc(a); db.rpc(b); db.rpc(c); }`,
      errors: [
        { messageId: 'dynamicRpcName' },
        { messageId: 'dynamicRpcName' },
        { messageId: 'dynamicRpcName' },
      ],
    },
  ],
});
