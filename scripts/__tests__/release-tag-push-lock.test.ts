import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RELEASE = readFileSync(resolve(ROOT, '.github/workflows/release.yml'), 'utf-8');

/**
 * Comment lines removed before matching for the forbidden shape.
 *
 * The fix's own comment quotes the line that caused the bug, which is worth
 * keeping — and a checker matching printed source would flag the workflow for
 * DESCRIBING the defect it fixed. That exact trap cost a CI run earlier the
 * same day in `suggestions-meta-lock`, so this one strips first.
 */
const RELEASE_CODE = RELEASE.split('\n')
  .filter((line) => !/^\s*#/.test(line))
  .join('\n');

/**
 * Locks for the tag-push race that broke the 2026-08-23 release AFTER publish.
 *
 * The workflow fans out one job per package. Nine of them pushed tags to the
 * same remote at once, five lost the race, and the line
 *
 *   git push origin "$tag_name" || echo "(tag push failed — likely already on remote)"
 *
 * reported the reassuring guess instead of checking. `gh release create` three
 * lines below then died with "tag exists locally but has not been pushed".
 *
 * The failure landed in the worst possible place: npm had all nine packages,
 * public and unrecallable, while GitHub had no tag and no release for five of
 * them. `release.yml` compares versions against npm to decide what to publish,
 * so it would never have retried them either.
 *
 * Two independent defences, because either alone can still lose:
 *   1. verify the tag actually reached the remote, and retry — never assert it
 *   2. `gh release create --target`, so GitHub creates the tag from the commit
 *      if the push lost anyway
 */
describe('release.yml tag handling', () => {
  it('never claims a failed tag push is "already on remote"', () => {
    // The exact shape that shipped the bug: a bare `||` swallowing the failure
    // and narrating a cause it did not check.
    expect(RELEASE_CODE).not.toMatch(/git push origin "\$tag_name" \|\| echo/);
  });

  it('verifies the tag reached the remote rather than assuming', () => {
    expect(RELEASE).toContain('git ls-remote --exit-code --tags origin "refs/tags/$tag_name"');
  });

  it('retries the push, because contention is expected with a matrix fan-out', () => {
    expect(RELEASE).toMatch(/for attempt in 1 2 3; do/);
  });

  it('warns when the tag never landed, instead of continuing silently', () => {
    expect(RELEASE).toMatch(/::warning::tag \$tag_name never reached the remote/);
  });

  it('creates the release against an explicit target commit', () => {
    // The second defence. Without it the step needs a tag already on the
    // remote, which is precisely what a lost race denies it.
    expect(RELEASE).toMatch(/gh release create "\$TAG_NAME" \\\n\s*--target "\$GITHUB_SHA"/);
  });
});
