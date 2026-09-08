/**
 * @provenBy {"file":"scripts/prune-benchmark-results.ts","find":"if (isCited(REPO_ROOT, suite.name, file)) {","replace":"if (false) {"}
 */

/*
 * Retention must not delete a snapshot a document cites.
 *
 * Two schedules run against `benchmarks/results/` and neither knows about
 * the other: `weekly-benchmark.yml` keeps the three most recent dated
 * snapshots per suite, and documents cite individual snapshots as the
 * evidence behind a claim. `CLAIMS.md` links twenty of them. They have
 * already collided — `.agent/flagship-rules.md` cited
 * `ilb-flagship/2026-05-10.json`, the snapshot aged out, and the dead link
 * landed in an unrelated automated PR (#925) whose author had touched
 * neither the doc nor the file.
 *
 * `.agent` docs answer this by being forbidden to cite the directory at all
 * (`agent-doc-links-expire.lock.test.ts`). For an evidence ledger that rule
 * is wrong — the specific file IS the claim — so the pin runs the other way
 * and retention has to honour it.
 *
 * The third case is the one that would have caught the live defect: a
 * citation whose file retention already removed. That is not hypothetical
 * — `benchmarks/FP_FN_REMEDIATION_TRACKER.md` pointed at
 * `ilb-cwe-corpus/2026-05-03.json`, deleted weeks before this lock existed.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PRUNER = path.join(REPO_ROOT, 'scripts', 'prune-benchmark-results.ts');

const SNAPSHOTS = [
  '2026-01-01.json',
  '2026-02-01.json',
  '2026-03-01.json',
  '2026-04-01.json',
  '2026-05-01.json',
];

/**
 * A checkout with five dated snapshots in one suite and a document citing
 * `doc`. git, not the filesystem, is the source of truth for "tracked".
 */
const checkoutCiting = (cited: string): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-cited-'));
  const suite = path.join(root, 'benchmarks', 'results', 'ilb-demo');
  fs.mkdirSync(suite, { recursive: true });
  for (const name of SNAPSHOTS) fs.writeFileSync(path.join(suite, name), '{}');
  fs.writeFileSync(
    path.join(root, 'EVIDENCE.md'),
    `Measured once: [run](./benchmarks/results/ilb-demo/${cited})\n`,
  );
  const git = (...a: string[]) =>
    execFileSync('git', a, { cwd: root, stdio: 'ignore' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  git('add', '-A');
  git('commit', '-qm', 'fixture');
  return root;
};

const prune = (root: string): void => {
  execFileSync('npx', ['tsx', PRUNER, '--keep=3', `--root=${root}`], {
    cwd: REPO_ROOT,
    stdio: 'ignore',
  });
};

const survivors = (root: string): string[] =>
  fs.readdirSync(path.join(root, 'benchmarks', 'results', 'ilb-demo')).sort();

describe('retention honours a citation', () => {
  it('keeps the oldest snapshot when a tracked document cites it', () => {
    const root = checkoutCiting('2026-01-01.json');
    prune(root);
    // Fourth and fifth oldest by age, but the first is spoken for.
    expect(survivors(root)).toEqual([
      '2026-01-01.json',
      '2026-03-01.json',
      '2026-04-01.json',
      '2026-05-01.json',
    ]);
  });

  it('still deletes the snapshots nothing cites', () => {
    // Without this the pin could be unconditional and the first case would
    // pass just as well.
    const root = checkoutCiting('2026-05-01.json'); // newest — never at risk
    prune(root);
    expect(survivors(root)).toEqual([
      '2026-03-01.json',
      '2026-04-01.json',
      '2026-05-01.json',
    ]);
  });
});

/**
 * Markdown links only, and only outside `benchmarks/results/` itself.
 *
 * The pin in `lib/benchmark-citations.ts` matches any occurrence in tracked
 * text on purpose; here the predicate has to be narrow, because prose that
 * records a deletion ("Deleted `…/2026-05-11.json` (51 MB dead file)") names
 * a path that is *supposed* to be gone. A link is the narrower thing: a
 * promise that the file resolves.
 */
const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const stripCode = (t: string): string =>
  t.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');

describe('every snapshot this repo links to is present', () => {
  it('has no citation pointing at a pruned file', () => {
    const docs = execFileSync('git', ['ls-files', '*.md', '*.mdx'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      maxBuffer: 32 * 1024 * 1024,
    })
      .split('\n')
      .filter((d) => d && !d.startsWith('benchmarks/results/'));

    const dead: string[] = [];
    for (const doc of docs) {
      const text = stripCode(
        fs.readFileSync(path.join(REPO_ROOT, doc), 'utf-8'),
      );
      for (const m of text.matchAll(LINK)) {
        const raw = m[1];
        if (/^(https?:|mailto:|file:|#|<|\$)/.test(raw)) continue;
        const target = raw.split('#')[0];
        if (!target) continue;
        const abs = path.resolve(
          path.dirname(path.join(REPO_ROOT, doc)),
          target,
        );
        const rel = path.relative(REPO_ROOT, abs);
        if (!rel.startsWith(`benchmarks${path.sep}results${path.sep}`))
          continue;
        if (!fs.existsSync(abs)) dead.push(`${doc} → ${raw}`);
      }
    }
    expect(dead).toEqual([]);
  });
});
