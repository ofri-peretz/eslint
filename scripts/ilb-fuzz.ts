#!/usr/bin/env -S npx tsx

/**
 * ILB Fuzz (Gap E) — for each Interlace rule, asks an LLM to generate
 *
 *   • 5 code patterns that **should** trigger the rule but won't
 *     (FN candidates — recall blind spots)
 *   • 5 code patterns that **shouldn't** trigger but will
 *     (FP candidates — precision blind spots)
 *
 * The LLM gets the rule's source code as context, so candidates target
 * the actual implementation, not a generic guess at what the rule does.
 *
 * Workflow:
 *   1. Generate candidates per rule → `benchmark-results/fuzz/<rule>.json`
 *   2. Lint each candidate against the rule
 *   3. Disagreements (LLM said "should fire" but rule didn't, or vice versa)
 *      surface as new fixture candidates for human triage
 *
 * Costs ~$0.02 per rule on Claude Sonnet, ~$10 for the full ~500-rule fleet
 * per quarterly run.
 *
 * Status: SCAFFOLD. Generation step is wired (requires ANTHROPIC_API_KEY);
 * the lint+verify step is a TODO — the same `eslint --rulesdir` logic that
 * powers ILB-Wild can be reused but isn't yet.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... tsx scripts/ilb-fuzz.ts                  # full fleet
 *   tsx scripts/ilb-fuzz.ts --plugin=secure-coding                    # one plugin
 *   tsx scripts/ilb-fuzz.ts --rule=detect-object-injection            # one rule
 *   tsx scripts/ilb-fuzz.ts --dry-run                                 # don't call API
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const OUT_DIR = path.join(ROOT, 'benchmark-results', 'fuzz');

const args = process.argv.slice(2);
const opt = (name: string): string | undefined => {
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
};
const flag = (name: string): boolean => args.includes(`--${name}`);

const PLUGIN_FILTER = opt('plugin');
const RULE_FILTER = opt('rule');
const DRY_RUN = flag('dry-run');
const MODEL = opt('model') ?? 'claude-sonnet-4-6';

interface Rule {
  plugin: string;
  rule: string;
  sourceFile: string;
  source: string;
  docFile: string | null;
  docHead: string | null;
}

function listRules(): Rule[] {
  const rules: Rule[] = [];
  for (const plugin of fs.readdirSync(PACKAGES_DIR)) {
    if (!plugin.startsWith('eslint-plugin-')) continue;
    if (PLUGIN_FILTER && !plugin.endsWith(PLUGIN_FILTER)) continue;
    const rulesDir = path.join(PACKAGES_DIR, plugin, 'src', 'rules');
    if (!fs.existsSync(rulesDir)) continue;
    walk(rulesDir, (file) => {
      if (!/\.tsx?$/.test(file) || file.endsWith('.test.ts') || file.endsWith('.d.ts')) return;
      const dir = path.basename(path.dirname(file));
      const ruleName = file.endsWith('index.ts') || file.endsWith('index.tsx')
        ? dir
        : path.basename(file).replace(/\.tsx?$/, '');
      if (ruleName === 'rules' || ruleName === '__tests__') return;
      if (RULE_FILTER && ruleName !== RULE_FILTER) return;
      const source = fs.readFileSync(file, 'utf-8');
      const docPath = path.join(PACKAGES_DIR, plugin, 'docs', 'rules', `${ruleName}.md`);
      const doc = fs.existsSync(docPath) ? fs.readFileSync(docPath, 'utf-8') : null;
      rules.push({
        plugin,
        rule: ruleName,
        sourceFile: path.relative(ROOT, file),
        source,
        docFile: doc ? path.relative(ROOT, docPath) : null,
        docHead: doc ? doc.slice(0, 800) : null,
      });
    });
  }
  return rules;
}

function walk(dir: string, visit: (file: string) => void) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p, visit);
    else visit(p);
  }
}

function buildPrompt(r: Rule): string {
  return `You are auditing an ESLint rule for false-positive (FP) and false-negative (FN) blind spots.

The rule's source code is below. Read it carefully and identify edge cases the implementation might mishandle.

Generate exactly:
- 5 JavaScript/TypeScript snippets that, **per the rule's documented intent**, SHOULD be flagged — but you suspect the implementation will miss (FN candidates).
- 5 JavaScript/TypeScript snippets that, **per the rule's documented intent**, should NOT be flagged — but you suspect the implementation will incorrectly flag (FP candidates).

Each snippet must:
- Be self-contained, syntactically valid, and 5–20 lines
- Target a specific implementation gap you identified — not a generic guess
- Include a one-line // FN: or // FP: comment at the top explaining the suspected gap

Output strict JSON with shape:
{
  "fnCandidates": [{"code": "...", "rationale": "..."}],
  "fpCandidates": [{"code": "...", "rationale": "..."}]
}

Rule: ${r.plugin}/${r.rule}

Documentation excerpt (first 800 chars):
${r.docHead ?? '(no doc)'}

Source code:
\`\`\`typescript
${r.source}
\`\`\`
`;
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content: Array<{ type: string; text: string }> };
  return data.content.find((c) => c.type === 'text')?.text ?? '';
}

async function main() {
const rules = listRules();
console.log(`Found ${rules.length} rule(s) matching filters`);

if (DRY_RUN) {
  console.log('--- Dry run; sample prompt for first rule ---');
  if (rules.length > 0) console.log(buildPrompt(rules[0]).slice(0, 2000));
  process.exit(0);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not set — re-run with the env var or pass --dry-run.');
  process.exit(2);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
let totalCalls = 0;
let totalFn = 0;
let totalFp = 0;
const errors: string[] = [];

for (const r of rules) {
  const outPath = path.join(OUT_DIR, `${r.plugin}__${r.rule}.json`);
  if (fs.existsSync(outPath)) {
    console.log(`  skip  ${r.plugin}/${r.rule} (already generated; delete to regenerate)`);
    continue;
  }
  process.stdout.write(`  fuzz  ${r.plugin}/${r.rule} ... `);
  try {
    const reply = await callClaude(buildPrompt(r));
    totalCalls++;
    // Extract JSON from reply (LLM may wrap in markdown fences).
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('no JSON in reply');
      errors.push(`${r.plugin}/${r.rule}: no JSON parsed`);
      continue;
    }
    const parsed = JSON.parse(jsonMatch[0]);
    fs.writeFileSync(outPath, JSON.stringify({ ...r, candidates: parsed, model: MODEL, generatedAt: new Date().toISOString() }, null, 2));
    totalFn += parsed.fnCandidates?.length ?? 0;
    totalFp += parsed.fpCandidates?.length ?? 0;
    console.log(`✓ ${parsed.fnCandidates?.length ?? 0} FN + ${parsed.fpCandidates?.length ?? 0} FP`);
    // Cooperative rate limit (Anthropic: 50 req/min on default tier).
    await new Promise((r) => setTimeout(r, 1500));
  } catch (err) {
    console.log(`error: ${(err as Error).message}`);
    errors.push(`${r.plugin}/${r.rule}: ${(err as Error).message}`);
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  model: MODEL,
  rulesProcessed: totalCalls,
  rulesTotal: rules.length,
  fnCandidatesGenerated: totalFn,
  fpCandidatesGenerated: totalFp,
  errors,
  TODO: [
    'Lint each candidate against the rule (reuse ilb-arena harness)',
    'Compare LLM expectation vs actual rule verdict',
    'Surface disagreements as new fixture candidates in benchmarks/corpus/llm-fuzzed/',
  ],
};
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(
  `\n✅ ${path.relative(ROOT, OUT_DIR)} · ${totalCalls}/${rules.length} rules · ${totalFn} FN + ${totalFp} FP candidates · ${errors.length} errors`,
);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
