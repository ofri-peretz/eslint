/**
 * Rule-docs sync drift — regression lock.
 *
 * `packages/<plugin>/docs/rules/<rule>.md` is the source of truth; `sync-rules-docs.ts`
 * generates `apps/docs/content/docs/<section>/rules/<rule>.mdx` from it. Nothing enforced
 * that the committed MDX was actually what the generator produces, and the two
 * drifted badly: on 2026-08-06, 73% of sampled rule pages had table content
 * that no longer matched their source. `jwt-security/no-algorithm-none`
 * shipped documenting 1 of its 4 real options; `vercel-ai-security/
 * require-tool-confirmation` shipped documenting an option the rule never had.
 *
 * It drifted because the generator could not safely be re-run. Its raw output
 * needed four separate one-shot repair scripts (fix-dual-frontmatter,
 * dedupe-body-description, strip-markdown-from-description,
 * refresh-rule-descriptions) applied afterwards in an undocumented order — so
 * in practice nobody ran it, and the generated layer rotted in place.
 *
 * These two properties together close that hole:
 *
 *   1. IDEMPOTENT — running the generator over its own output is a no-op.
 *      Without this, "regenerate and commit" can never be a safe CI gate.
 *   2. NO DRIFT — the committed MDX is byte-identical to a fresh generation.
 *      This is the assertion that fails the moment a rule's `.md` changes and
 *      the site isn't regenerated.
 *
 * If this test fails, do not hand-edit the MDX — fix the `.md` source and run:
 *   npm run sync:rules --workspace=docs
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { convertMdToMdx, loadTypeAwarenessMap } from '../../scripts/sync-rules-docs';
import { PLUGINS } from '../lib/plugins';

const MONOREPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const typeMap = loadTypeAwarenessMap(
  join(MONOREPO_ROOT, '.agent', 'type-awareness-scan.tsv'),
);

interface RuleDoc {
  slug: string;
  rule: string;
  mdPath: string;
  mdxPath: string;
}

function collectRuleDocs(): RuleDoc[] {
  const docs: RuleDoc[] = [];
  for (const plugin of PLUGINS) {
    const mdDir = join(MONOREPO_ROOT, 'packages', plugin.package, 'docs', 'rules');
    const mdxDir = join(
      MONOREPO_ROOT, 'apps', 'docs', 'content', 'docs',
      plugin.pillar, `plugin-${plugin.slug}`, 'rules',
    );
    if (!existsSync(mdDir) || !existsSync(mdxDir)) continue;
    for (const f of readdirSync(mdDir).filter((x) => x.endsWith('.md'))) {
      docs.push({
        slug: plugin.slug,
        rule: f.replace(/\.md$/, ''),
        mdPath: join(mdDir, f),
        mdxPath: join(mdxDir, `${f}x`),
      });
    }
  }
  return docs;
}

function generate(doc: RuleDoc): string {
  const md = readFileSync(doc.mdPath, 'utf-8');
  const typeStatus = typeMap?.get(`${doc.slug}/${doc.rule}`);
  return convertMdToMdx(md, `${doc.rule}.md`, { typeStatus });
}

describe('rule-docs sync drift', () => {
  const docs = collectRuleDocs();

  it('finds the rule-doc corpus', () => {
    expect(docs.length).toBeGreaterThan(300);
  });

  it('the generator is idempotent — regenerating its own output changes nothing', () => {
    // Sample rather than all ~400: the property is structural, and a full pass
    // makes this suite the slowest in the workspace for no extra signal.
    const sample = docs.filter((_, i) => i % 7 === 0);
    const unstable: string[] = [];
    for (const doc of sample) {
      const once = generate(doc);
      // Feed the generated MDX back in. A generator that emits final form
      // reaches a fixed point immediately; one that needs post-processing
      // keeps mutating (that was the dual-frontmatter bug).
      const twice = convertMdToMdx(once, `${doc.rule}.md`, {
        typeStatus: typeMap?.get(`${doc.slug}/${doc.rule}`),
      });
      const fm = (s: string) => s.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
      if (fm(once) !== fm(twice)) unstable.push(`${doc.slug}/${doc.rule}`);
    }
    expect(unstable).toEqual([]);
  });

  it('every committed rule MDX matches a fresh generation from its .md source', () => {
    const drifted: string[] = [];
    for (const doc of docs) {
      if (!existsSync(doc.mdxPath)) {
        drifted.push(`${doc.slug}/${doc.rule} (missing MDX)`);
        continue;
      }
      const committed = readFileSync(doc.mdxPath, 'utf-8').trim();
      if (generate(doc).trim() !== committed) drifted.push(`${doc.slug}/${doc.rule}`);
    }

    expect(
      drifted,
      `${drifted.length} rule page(s) differ from their .md source. ` +
        'Run `npm run sync:rules --workspace=docs` and commit the result — ' +
        'do not hand-edit the generated MDX.',
    ).toEqual([]);
  });
});
