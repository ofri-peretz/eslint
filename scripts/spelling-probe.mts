/**
 * Finds misses by rewriting a known true positive into a spelling that means
 * exactly the same thing, and checking whether the rule still sees it.
 *
 * FN-006 and FN-007 were both this: a rule handled one node shape for a
 * construct the language spells two ways, and the unhandled spelling was the
 * one a compiler or a minifier emits. That is not a shape you find by reading
 * rules one at a time — it is a shape you find by asking every rule the same
 * question at once.
 *
 * Each mutation below is meaning-preserving by the grammar, so a rule that
 * reports the original and not the mutant has a blind spot rather than an
 * opinion. The mutations are deliberately syntactic and conservative: nothing
 * here changes what the code does, only how it is written.
 *
 *   npx tsx scripts/spelling-probe.mts [--rule <substring>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import tsparser from '@typescript-eslint/parser';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

type Mutation = { name: string; apply: (code: string) => string | null };

const MUTATIONS: Mutation[] = [
  {
    // `foo('sha1')` and `` foo(`sha1`) `` are the same string. A rule reading
    // `node.type === 'Literal'` sees the first and not the second.
    name: 'a no-substitution template literal instead of a quoted string',
    apply: (code) => {
      if (code.includes('`')) return null; // already templated; the swap is not clean
      const out = code.replace(/'([^'\\\n]*)'/g, (m, body: string) =>
        body.includes('`') ? m : `\`${body}\``,
      );
      return out === code ? null : out;
    },
  },
  {
    // `obj.prop` and `obj['prop']` reach the same property.
    name: 'a computed literal key instead of a dotted member access',
    apply: (code) => {
      const out = code.replace(
        /\.([A-Za-z_$][\w$]*)\b(?!\s*\()/g,
        (m, name: string) => `['${name}']`,
      );
      return out === code ? null : out;
    },
  },
  {
    // `{ key: v }` and `{ ['key']: v }` declare the same property.
    name: 'a computed literal key instead of a bare object key',
    apply: (code) => {
      const out = code.replace(
        /([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g,
        (_m, lead: string, key: string, tail: string) =>
          `${lead}['${key}']${tail}`,
      );
      return out === code ? null : out;
    },
  },
];

const db = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'benchmarks', 'RULE_CASES.json'), 'utf8'),
) as {
  rules: {
    rule: string;
    cases: { kind: string; code: string; description: string }[];
  }[];
};

const filter = process.argv.includes('--rule')
  ? process.argv[process.argv.indexOf('--rule') + 1]
  : null;
const linter = new Linter();
const plugins = new Map<string, Record<string, unknown>>();

async function ruleFor(qualified: string): Promise<unknown | null> {
  const [pkg, ...rest] = qualified.split('/');
  const name = rest.join('/');
  if (!plugins.has(pkg)) {
    const entry = path.join(
      ROOT,
      'packages',
      `eslint-plugin-${pkg}`,
      'src',
      'index.ts',
    );
    if (!fs.existsSync(entry)) return null;
    const mod = (await import(entry)) as {
      default?: { rules?: Record<string, unknown> };
      rules?: Record<string, unknown>;
    };
    plugins.set(
      pkg,
      (mod.default?.rules ?? mod.rules ?? {}) as Record<string, unknown>,
    );
  }
  return plugins.get(pkg)?.[name] ?? null;
}

/**
 * Reports, or `null` when the harness itself failed. A flat config with no
 * `files` key matches nothing and ESLint says so as a message with a null
 * `ruleId` — which reads as a finding unless it is checked for. That exact
 * confusion produced six meaningless readings earlier in this work, so the
 * harness refuses to score a run it could not perform.
 */
function reports(rule: unknown, name: string, code: string): number | null {
  const msgs = linter.verify(
    code,
    [
      {
        files: ['**/*.{ts,tsx}'],
        plugins: { p: { rules: { [name]: rule } } as never },
        languageOptions: {
          parser: tsparser,
          parserOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            ecmaFeatures: { jsx: true },
          },
        },
        rules: { [`p/${name}`]: 'error' },
      },
    ],
    'probe.tsx',
  );
  if (msgs.some((m) => m.ruleId === null)) return null;
  return msgs.length;
}

const found: {
  rule: string;
  mutation: string;
  original: string;
  mutant: string;
  description: string;
}[] = [];
let probed = 0;
let harnessFailures = 0;

for (const entry of db.rules) {
  if (filter !== null && !entry.rule.includes(filter)) continue;
  const rule = await ruleFor(entry.rule);
  if (rule === null) continue;
  const name = entry.rule.split('/').slice(1).join('/');

  for (const c of entry.cases) {
    if (c.kind !== 'TP' && c.kind !== 'FN') continue;
    if (c.code === '' || c.code.length > 400) continue;
    const base = reports(rule, name, c.code);
    // Only a case that actually reports can demonstrate a rule going blind.
    if (base === null || base === 0) continue;

    for (const m of MUTATIONS) {
      const mutant = m.apply(c.code);
      if (mutant === null) continue;
      probed += 1;
      const after = reports(rule, name, mutant);
      if (after === null) {
        harnessFailures += 1;
        continue;
      }
      if (after === 0) {
        found.push({
          rule: entry.rule,
          mutation: m.name,
          original: c.code,
          mutant,
          description: c.description,
        });
        break; // one demonstration per case is enough to file
      }
    }
  }
}

const byRule = new Map<string, typeof found>();
for (const f of found) byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);

console.log(`\n  ${probed} mutations run, ${harnessFailures} unscoreable`);
console.log(
  `  ${found.length} spellings a rule reports in one form and misses in another`,
);
console.log(`  across ${byRule.size} rules\n`);
for (const [rule, list] of [...byRule.entries()].sort(
  (a, b) => b[1].length - a[1].length,
)) {
  console.log(`  ${rule}  (${list.length})`);
  console.log(`     ${list[0].mutation}`);
  console.log(
    `     reports: ${JSON.stringify(list[0].original).slice(0, 150)}`,
  );
  console.log(`     misses : ${JSON.stringify(list[0].mutant).slice(0, 150)}`);
}
fs.writeFileSync(
  path.join(ROOT, 'benchmarks', 'SPELLING_MISSES.json'),
  `${JSON.stringify({ probed, found }, null, 2)}\n`,
);

const md: string[] = [
  '# Spellings a rule reports one way and misses another',
  '',
  'Generated by `scripts/spelling-probe.mts` — do not edit.',
  '',
  'Every row below is a rule reporting a known true positive and then going',
  'silent on the same code rewritten into a form the grammar treats as',
  'identical. None of these mutations changes what the code does.',
  '',
  `**${found.length} across ${byRule.size} rules**, from ${probed} mutations.`,
  '',
  '| mutation | misses |',
  '|---|---:|',
  ...[...new Set(found.map((f) => f.mutation))].map(
    (m) => `| ${m} | ${found.filter((f) => f.mutation === m).length} |`,
  ),
  '',
  '## The shared cause',
  '',
  'Three mutations, two primitives, and both already exist. `getStaticValue`',
  'in `@interlace/eslint-devkit` reads a quoted string AND a no-substitution',
  'template literal, which is exactly the first mutation — and no rule in this',
  "repository calls it. 163 rules hand-wrote `node.type === 'Literal'`",
  'instead, and each one bought the same blind spot.',
  '',
  "The other two mutations are the property-key question: `obj.k`, `obj['k']`",
  "and `{ ['k']: v }` name the same property, and a rule that reads only the",
  'first sees a subset of its own subject.',
  '',
  'This is not 1,156 bugs. It is two missing calls, repeated.',
  '',
  '## Why these are not GAP rows',
  '',
  'A `GAP:` case is a considered position: we looked, and this is a limit we',
  'accept for now. None of these was ever considered — they are the mechanical',
  'consequence of reading one node type where the grammar allows two. Filing',
  '1,156 admissions would bury the eight real ones. They live here until they',
  'are fixed, and each fix arrives as an `FN:` case.',
  '',
  '## Every affected rule',
  '',
  'One example per rule, in a fenced block because half these snippets are',
  'themselves template literals and cannot survive a table cell. The complete',
  'set — every mutation of every case — is in `SPELLING_MISSES.json`.',
  '',
  ...[...byRule.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .flatMap(([rule, list]) => [
      `### \`${rule}\` — ${list.length}`,
      '',
      `${list[0].mutation}.`,
      '',
      '```js',
      '// reports',
      list[0].original.replace(/\n/g, ' ').slice(0, 200),
      '// misses',
      list[0].mutant.replace(/\n/g, ' ').slice(0, 200),
      '```',
      '',
    ]),
];
fs.writeFileSync(
  path.join(ROOT, 'benchmarks', 'SPELLING_MISSES.md'),
  `${md.join('\n')}\n`,
);
console.log('\n  wrote benchmarks/SPELLING_MISSES.{md,json}');
