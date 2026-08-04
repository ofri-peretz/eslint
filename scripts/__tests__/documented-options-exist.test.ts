/**
 * Every option named in a rule's Options table must exist in its `meta.schema`.
 *
 * This is not a tidiness check. Every rule schema in this repo sets
 * `additionalProperties: false`, so an option that appears only in the docs
 * does not fail quietly — it aborts the consumer's entire lint run:
 *
 *   Key "rules": Key "vercel-ai-security/no-hardcoded-api-keys":
 *     Value {"keyPatterns":[...]} should NOT have additional properties.
 *     Unexpected property "keyPatterns". Expected properties: "apiKeyPatterns".
 *
 * That is the first thing a new user hits, because configuring a rule means
 * copying the name out of our own documentation. Ten such names shipped across
 * two plugins; six of the seven affected tables were fictional end to end, not
 * one documented option existed.
 *
 * The reverse direction (a real option nobody documented) is a gap rather than
 * a break, so it is not asserted here — see the follow-up issue.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PACKAGES = join(import.meta.dirname, '../../packages');

interface RuleLike {
  meta?: { schema?: unknown };
  create?: unknown;
}

/** Option names declared in a rule's JSON schema. */
function schemaOptions(rule: RuleLike): string[] {
  const schema = rule.meta?.schema;
  const first = Array.isArray(schema) ? schema[0] : schema;
  const properties = (first as { properties?: Record<string, unknown> } | undefined)?.properties;
  return Object.keys(properties ?? {});
}

/**
 * Option names in the doc's Options table.
 *
 * Headings carry emoji (`## ⚙️ Options`), and only the table under that
 * heading counts — a rule's docs also table error fields and comparisons,
 * which are not options.
 */
function documentedOptions(markdown: string): string[] {
  const section = markdown.split(/^##+ /m).find((s) => /^[^A-Za-z\n]*options\b/i.test(s));
  if (section === undefined) return [];
  return [...section.matchAll(/^\|\s*`([A-Za-z_$][\w$]*)`\s*\|/gm)].map((m) => m[1]!);
}

/** Every rule that ships both an implementation and a doc page. */
async function allRules(): Promise<{ id: string; rule: RuleLike; doc: string }[]> {
  const out: { id: string; rule: RuleLike; doc: string }[] = [];
  for (const pkg of readdirSync(PACKAGES).sort()) {
    const rulesDir = join(PACKAGES, pkg, 'src/rules');
    const docsDir = join(PACKAGES, pkg, 'docs/rules');
    if (!existsSync(rulesDir) || !existsSync(docsDir)) continue;

    for (const name of readdirSync(rulesDir).sort()) {
      const source = join(rulesDir, name, 'index.ts');
      const doc = join(docsDir, `${name}.md`);
      if (!existsSync(source) || !existsSync(doc)) continue;

      const module = (await import(pathToFileURL(source).href)) as Record<string, unknown>;
      const rule = Object.values(module).find(
        (v): v is RuleLike =>
          typeof v === 'object' && v !== null && 'meta' in v && 'create' in v,
      );
      if (rule) out.push({ id: `${pkg}/${name}`, rule, doc: readFileSync(doc, 'utf-8') });
    }
  }
  return out;
}

describe('documented rule options', () => {
  // Imports every rule module in the workspace — a few seconds, well over the
  // 5s default.
  it('every option in an Options table exists in the rule schema', { timeout: 60_000 }, async () => {
    const rules = await allRules();
    expect(rules.length).toBeGreaterThan(200);

    const ghosts = rules.flatMap(({ id, rule, doc }) => {
      const declared = schemaOptions(rule);
      return documentedOptions(doc)
        .filter((option) => !declared.includes(option))
        .map((option) => `${id}: documents "${option}" — schema accepts [${declared.join(', ')}]`);
    });

    expect(ghosts).toEqual([]);
  });
});
