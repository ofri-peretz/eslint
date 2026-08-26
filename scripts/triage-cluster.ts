#!/usr/bin/env -S npx tsx
/**
 * Cluster real-world findings by SHAPE so triage is a few dozen decisions
 * rather than tens of thousands.
 *
 * 26,434 findings came out of 158 cloned repositories. Reviewed one at a time
 * that is not a task anyone finishes, so nothing gets reviewed and precision
 * stays unmeasured. But findings repeat: no-hardcoded-credentials produced 116
 * hits across 14 repositories from a handful of distinct code shapes, and about
 * twenty of them were the same generated TypeORM migration line.
 *
 * So: normalise each finding's source to a signature that ignores identifiers
 * and literals, group by (rule, signature), and rank by size. One verdict on
 * the largest cluster settles every instance in it.
 *
 * Usage:
 *   npx tsx scripts/triage-cluster.ts <findings-dir> [--rule <id>] [--top N]
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] ?? '/tmp/inv';
const ruleFilter = process.argv.includes('--rule')
  ? process.argv[process.argv.indexOf('--rule') + 1]
  : null;
const top = process.argv.includes('--top')
  ? Number(process.argv[process.argv.indexOf('--top') + 1])
  : 25;

const KEYWORDS =
  /^(await|async|const|let|var|function|return|if|else|new|throw|for|while|import|from|export|class|extends|this|null|true|false|undefined)$/;

/**
 * A shape signature: the line with identifiers, strings and numbers folded
 * away, so `repo.save(req.body)` and `userRepository.save(request.body)` land
 * in the same bucket. Deliberately crude — the goal is to make review finite,
 * and a cluster that turns out mixed simply gets split by hand.
 */
function signature(line: string): string {
  return line
    .trim()
    .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, 'S')
    .replace(/\b\d+(?:\.\d+)?\b/g, 'N')
    .replace(/\b[A-Za-z_$][\w$]*\b/g, (w) => (KEYWORDS.test(w) ? w : 'X'))
    .replace(/\s+/g, ' ')
    .slice(0, 160);
}

type Cluster = {
  rule: string; sig: string; count: number;
  repos: Set<string>; sample: string; where: string[];
};

/**
 * Build output is not code anyone wrote, and it dominates everything.
 *
 * The first clustering run put 10,859 of 26,434 findings — 41% — into four
 * shapes, and all four were minified bundles: a webpack runtime in kolibri, a
 * UMD build in SpringRoll, PayPal's shipped messaging.js. Triaging those would
 * be triaging esbuild's output, and any fixture cut from them would encode a
 * minifier's habits rather than a developer's.
 *
 * The outreach scanner already excludes these; this inventory did not, because
 * it ran the raw benchmark config.
 */
const GENERATED =
  /(^|\/)(dist|build|out|coverage|vendor|node_modules|\.next|\.nuxt|static)\//i;
const MINIFIED = /\.(min|bundle|umd|esm|cjs)\.[cm]?jsx?$/i;

/** A line that is really a whole file is minified, whatever it is called. */
const looksMinified = (line: string): boolean => line.length > 400;

const isGenerated = (filePath: string): boolean =>
  GENERATED.test(filePath) || MINIFIED.test(filePath);

const clusters = new Map<string, Cluster>();
const srcCache = new Map<string, string[]>();
let skippedGenerated = 0;

const lineOf = (file: string, n: number): string => {
  if (!srcCache.has(file)) {
    try { srcCache.set(file, fs.readFileSync(file, 'utf-8').split('\n')); }
    catch { srcCache.set(file, []); }
  }
  return srcCache.get(file)![n - 1] ?? '';
};

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  let parsed: unknown;
  try { parsed = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')); } catch { continue; }
  if (!Array.isArray(parsed)) continue;
  const repo = f.replace(/\.json$/, '');
  for (const file of parsed as { filePath: string; messages: { ruleId?: string; line: number }[] }[]) {
    for (const m of file.messages ?? []) {
      if (!m.ruleId) continue;
      if (ruleFilter && m.ruleId !== ruleFilter) continue;
      if (isGenerated(file.filePath)) { skippedGenerated++; continue; }
      const src = lineOf(file.filePath, m.line);
      if (!src.trim()) continue;
      if (looksMinified(src)) { skippedGenerated++; continue; }
      const sig = signature(src);
      const key = `${m.ruleId} ${sig}`;
      if (!clusters.has(key))
        clusters.set(key, { rule: m.ruleId, sig, count: 0, repos: new Set(), sample: src.trim(), where: [] });
      const c = clusters.get(key)!;
      c.count++;
      c.repos.add(repo);
      if (c.where.length < 3) c.where.push(`${repo}:${path.basename(file.filePath)}:${m.line}`);
    }
  }
}

const ranked = [...clusters.values()].sort((a, b) => b.count - a.count);
const totalFindings = ranked.reduce((n, c) => n + c.count, 0);
const covered = ranked.slice(0, top).reduce((n, c) => n + c.count, 0);

console.log(`\n${skippedGenerated.toLocaleString()} findings skipped as generated or minified output`);
console.log(`${totalFindings.toLocaleString()} findings in hand-written code -> ${ranked.length.toLocaleString()} distinct shapes`);
console.log(`the top ${top} shapes cover ${covered.toLocaleString()} findings (${Math.round((covered / totalFindings) * 100)}%)\n`);

for (const [i, c] of ranked.slice(0, top).entries()) {
  console.log(`${String(i + 1).padStart(3)}. ${String(c.count).padStart(5)}x  ${c.repos.size} repo(s)  ${c.rule}`);
  console.log(`      ${c.sample.slice(0, 120)}`);
  console.log(`      ${c.where[0]}`);
}

fs.writeFileSync(
  '/tmp/triage-clusters.json',
  JSON.stringify(ranked.map((c) => ({ ...c, repos: [...c.repos] })), null, 1),
);
