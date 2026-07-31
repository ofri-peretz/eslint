/**
 * Drift gate for the philosophy projection.
 *
 * The 23 `*_PHILOSOPHY.md` files at the repo root are the single source
 * of truth. `scripts/sync-philosophies.ts` projects each into
 * `apps/storybook/src/stories/philosophy/<slug>.mdx`. The generator
 * embeds a SHA-256 prefix of the source content in each generated
 * file's header comment.
 *
 * This test fails if a source `.md` is edited without re-running the
 * generator — the source's current hash won't match the hash baked
 * into the projection.
 */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const SB_DIR = path.join(REPO_ROOT, 'apps/storybook/src/stories/philosophy');

function slugFromFilename(file: string): string {
  return file
    .replace(/_PHILOSOPHY\.md$/, '')
    .toLowerCase()
    .replace(/_/g, '-');
}

const SOURCE_FILES = fs
  .readdirSync(REPO_ROOT)
  .filter((f) => /^[A-Z][A-Z0-9_]*_PHILOSOPHY\.md$/.test(f))
  .sort();

describe('philosophy projection drift', () => {
  it('has at least the 23 known design philosophies at the repo root', () => {
    expect(SOURCE_FILES.length).toBeGreaterThanOrEqual(23);
  });

  for (const file of SOURCE_FILES) {
    const slug = slugFromFilename(file);
    const sourcePath = path.join(REPO_ROOT, file);

    describe(slug, () => {
      const raw = fs.readFileSync(sourcePath, 'utf-8');
      const expectedHash = createHash('sha256')
        .update(raw)
        .digest('hex')
        .slice(0, 12);

      it('storybook projection exists and matches source hash', () => {
        const target = path.join(SB_DIR, `${slug}.mdx`);
        expect(
          fs.existsSync(target),
          `missing storybook projection: ${target} — run \`npm run sync:philosophies\``,
        ).toBe(true);
        const projected = fs.readFileSync(target, 'utf-8');
        expect(
          projected,
          `storybook projection drifted from source — run \`npm run sync:philosophies\``,
        ).toContain(`hash: ${expectedHash}`);
      });
    });
  }

  it('storybook index is present', () => {
    expect(fs.existsSync(path.join(SB_DIR, 'Index.mdx'))).toBe(true);
  });

  it('the design/components doc sections stay deleted from the docs app', () => {
    // Design-system content belongs to Storybook / ds.interlace.tools,
    // not the ESLint docs. A projection reappearing here means a stale
    // generator or an accidental restore.
    const docsContent = path.join(REPO_ROOT, 'apps/docs/content/docs');
    expect(fs.existsSync(path.join(docsContent, 'design'))).toBe(false);
    expect(fs.existsSync(path.join(docsContent, 'components'))).toBe(false);
  });
});
