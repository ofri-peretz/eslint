/**
 * Which benchmark snapshots a document has promised will still be there.
 *
 * `weekly-benchmark.yml` prunes `benchmarks/results/<suite>/` to the three
 * most recent dated snapshots. Documents cite individual snapshots as the
 * evidence behind a claim — `CLAIMS.md` alone links twenty of them — so
 * retention and citation are two schedules that know nothing about each
 * other. They already collided once: `.agent/flagship-rules.md` linked to
 * `ilb-flagship/2026-05-10.json`, the snapshot aged out, and the dead link
 * surfaced in an unrelated automated PR (#925).
 *
 * `.agent` docs are forbidden from citing this directory at all — see
 * `agent-doc-links-expire.lock.test.ts`. That is the right rule for an
 * operational doc, and the wrong one for an evidence ledger, where the
 * specific file IS the claim. So for every other document the pin runs the
 * other way: a cited snapshot is not prunable.
 *
 * Within a document the match is deliberately broad — any occurrence, prose
 * and code fences included, not just markdown links. Over-matching only
 * costs retention (a snapshot named in a jq drill is one a reader will run),
 * and pinning a path that no longer exists is a no-op.
 *
 * Documents only, though. Source files mention these paths while *reasoning*
 * about retention — this predicate's own lock test names a snapshot in a
 * comment, and so does `agent-doc-links-expire.lock.test.ts` — and a pin that
 * counted those would keep a file alive because something described it. A
 * document is where a citation is a promise to a reader.
 */
import { execFileSync } from 'node:child_process';

/**
 * `<suite>/<file>` rather than the repo-relative path: citations are written
 * relative to the citing document (`./results/…`, `../results/…`,
 * `benchmarks/results/…`) and only the tail is common to all three.
 */
export function isCited(root: string, suite: string, file: string): boolean {
  try {
    execFileSync(
      'git',
      [
        'grep',
        '--quiet',
        '--fixed-strings',
        `${suite}/${file}`,
        '--',
        '*.md',
        '*.mdx',
        ':(exclude)benchmarks/results',
      ],
      { cwd: root, stdio: 'ignore' },
    );
    return true;
  } catch {
    // exit 1 = no match. Any other failure (not a checkout, no git) also
    // lands here, and prunes as before rather than pinning everything.
    return false;
  }
}
