/*
 * An agent document must not cite a file with an expiry date.
 *
 * `weekly-benchmark.yml` keeps the three most recent dated snapshots per suite
 * under `benchmarks/results/` and prunes the rest. `.agent/flagship-rules.md`
 * linked to `ilb-flagship/2026-05-10.json`, so the week that snapshot aged out
 * the link died — and the breakage surfaced in an unrelated automated refresh
 * PR (#925), whose author had touched neither the doc nor the link.
 *
 * Existence alone cannot catch this: on the day the link is written the file
 * is there. The check has to reject the DIRECTORY, which is what makes it a
 * gate rather than a detector.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { brokenLinks } from '../run-evals';

const withDoc = (body: string, extra?: (root: string) => void) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-doc-links-'));
  fs.mkdirSync(path.join(root, '.agent'), { recursive: true });
  fs.writeFileSync(path.join(root, '.agent', 'doc.md'), body);
  extra?.(root);
  return { root, docs: ['.agent/doc.md'] };
};

describe('a link into a pruned directory is rejected while it still resolves', () => {
  it('rejects the snapshot link even though the file is present', () => {
    const { root, docs } = withDoc(
      'Full data: [x](../benchmarks/results/ilb-flagship/2026-08-31.json)',
      (r) => {
        const dir = path.join(r, 'benchmarks', 'results', 'ilb-flagship');
        fs.mkdirSync(dir, { recursive: true });
        // The file EXISTS. That is the whole point — a checker that only
        // tests existence passes here, and fails weeks later in someone
        // else's PR.
        fs.writeFileSync(path.join(dir, '2026-08-31.json'), '{}');
      },
    );
    const broken = brokenLinks(docs, root);
    expect(broken).toHaveLength(1);
    expect(broken[0]).toContain('pruned directory');
    expect(broken[0]).toContain('history.ndjson');
  });

  it('accepts the durable record the pruning does not touch', () => {
    const { root, docs } = withDoc(
      'Full data: [x](../benchmark-results/history.ndjson)',
      (r) => {
        fs.mkdirSync(path.join(r, 'benchmark-results'), { recursive: true });
        fs.writeFileSync(
          path.join(r, 'benchmark-results', 'history.ndjson'),
          '',
        );
      },
    );
    expect(brokenLinks(docs, root)).toEqual([]);
  });

  it('still reports an ordinary link that does not resolve', () => {
    // The pruned-directory arm must not have swallowed the original check.
    const { root, docs } = withDoc('See [x](../docs/nope.md)');
    expect(brokenLinks(docs, root)).toEqual([
      '.agent/doc.md → ../docs/nope.md',
    ]);
  });
});
