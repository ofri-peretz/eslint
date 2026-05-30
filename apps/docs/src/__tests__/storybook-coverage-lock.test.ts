/**
 * Storybook Coverage Lock
 *
 * Every primitive in `packages/ui/src/primitives/*.tsx` must have a matching
 * story in `apps/storybook/src/stories/primitives/*.stories.tsx`.
 *
 * Storybook is the visual contract surface for the design system — addon-a11y
 * + addon-themes run axe + dark-mode against every story in CI. A primitive
 * without a story is invisible to that gate, so visual / a11y regressions in
 * it ship silently. See LAYOUT_PHILOSOPHY.md, COLOR_PHILOSOPHY.md.
 *
 * History: prior to 2026-05-13 the layout primitives (Container, Section,
 * Stack) had stories in `packages/ui/src/stories/` but NOT in the runnable
 * `apps/storybook` host. Both trees existed in parallel and drifted.
 * The fix consolidated stories into `apps/storybook` and added this lock so
 * a future primitive can't be added without its story.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync } from 'fs';
import { join, resolve } from 'path';

// Use __dirname so this works regardless of whether vitest is invoked from the
// repo root (npx vitest run apps/docs/…) or from apps/docs (turbo run test).
// __dirname = apps/docs/src/__tests__ → ../../../.. = repo root
const REPO_ROOT = resolve(__dirname, '../../../..');
const PRIMITIVES_DIR = join(REPO_ROOT, 'packages/ui/src/primitives');
const STORIES_DIR = join(REPO_ROOT, 'apps/storybook/src/stories/primitives');

// Helpers that are NOT renderable React components — exclude from coverage.
const NON_COMPONENT_FILES = new Set(['button-variants.ts']);

const kebabToPascal = (name: string) =>
  name
    .replace(/\.tsx?$/, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

const listPrimitives = () =>
  readdirSync(PRIMITIVES_DIR)
    .filter((f) => /\.tsx?$/.test(f))
    .filter((f) => !NON_COMPONENT_FILES.has(f));

const listStories = () =>
  readdirSync(STORIES_DIR).filter((f) => f.endsWith('.stories.tsx'));

describe('Storybook primitive coverage (LAYOUT/COLOR/MOTION enforcement surface)', () => {
  it('every UI primitive has a matching story in apps/storybook', () => {
    const stories = new Set(listStories().map((f) => f.replace(/\.stories\.tsx$/, '')));
    const missing: string[] = [];

    for (const file of listPrimitives()) {
      const expectedStory = kebabToPascal(file);
      if (!stories.has(expectedStory)) {
        missing.push(`${file} → expected apps/storybook/src/stories/primitives/${expectedStory}.stories.tsx`);
      }
    }

    expect(missing, missing.join('\n')).toEqual([]);
  });

  it('no orphan story without a backing primitive', () => {
    const primitives = new Set(listPrimitives().map((f) => kebabToPascal(f)));
    const orphans: string[] = [];

    for (const file of listStories()) {
      const base = file.replace(/\.stories\.tsx$/, '');
      if (!primitives.has(base)) {
        orphans.push(`${file} — no matching file in packages/ui/src/primitives/`);
      }
    }

    expect(orphans, orphans.join('\n')).toEqual([]);
  });

  it('the duplicate story tree in packages/ui/src/stories must not regrow', () => {
    // After consolidation (2026-05-13) the in-package story tree should remain
    // empty / non-existent. If it comes back, two parallel Storybook setups
    // will drift again. Move new stories to apps/storybook instead.
    const inPackageStories = join(REPO_ROOT, 'packages/ui/src/stories');
    let entries: string[] = [];
    try {
      entries = readdirSync(inPackageStories).filter((f) => f.endsWith('.stories.tsx'));
    } catch {
      // Directory doesn't exist — that's the goal state.
    }
    expect(
      entries,
      `packages/ui/src/stories has ${entries.length} story file(s). Move them to apps/storybook/src/stories/ and delete the in-package copies — two parallel Storybook trees drift.`,
    ).toEqual([]);
  });
});
