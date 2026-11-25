/**
 * @provenBy {"file":"scripts/lib/plugin-agents-md.ts","find":"'## Presets'","replace":"'## Presetz'"}
 */

/**
 * Lock: every eslint-plugin-* package ships a consumer AGENTS.md, and that file
 * is exactly what scripts/lib/plugin-agents-md.ts renders from the package's own
 * metadata (package.json, exported `configs` and `rules`, the skill's stack map).
 *
 * Why it exists: an assistant that has one of our packages in node_modules reads
 * AGENTS.md to learn the presets and the sibling plugins. Hand-written, that file
 * drifts the first time a rule is added or a preset renamed (the contributor
 * AGENTS.md it replaced still told readers to run `nx`, which this repo no longer
 * uses). Generated and locked, it cannot. If this fails, run `npm run agents-md`.
 *
 * Reads the TypeScript source through the vitest aliases, so it needs no build.
 * Revert any piece and CI goes red: delete a file, drop "AGENTS.md" from a
 * package's `files`, rename a preset, or change a rule description.
 */
/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  AGENTS_MD_EXCLUDED,
  AGENTS_MD_MARKER,
  factsFrom,
  renderAgentsMd,
} from '../lib/plugin-agents-md';

const ROOT = resolve(__dirname, '../..');
const PACKAGES = join(ROOT, 'packages');
const stack = JSON.parse(
  readFileSync(
    join(ROOT, 'skills/security-linting/references/stack-map.json'),
    'utf8',
  ),
);

const loaders = import.meta.glob('../../packages/eslint-plugin-*/src/index.ts');
const loaderFor = (dir: string) =>
  loaders[`../../packages/${dir}/src/index.ts`];

const plugins = readdirSync(PACKAGES)
  .filter((d) => d.startsWith('eslint-plugin-'))
  .filter((d) => !(AGENTS_MD_EXCLUDED as readonly string[]).includes(d))
  .sort();

describe('consumer AGENTS.md', () => {
  it('covers every plugin except the declared exclusions', () => {
    expect(plugins.length).toBeGreaterThanOrEqual(31);
    expect([...AGENTS_MD_EXCLUDED]).toEqual([]);
  });

  it.each(plugins)(
    '%s ships a generated AGENTS.md that is up to date',
    async (dir) => {
      const pkg = JSON.parse(
        readFileSync(join(PACKAGES, dir, 'package.json'), 'utf8'),
      );
      expect(
        pkg.files,
        `${dir}: "AGENTS.md" must be in package.json#files`,
      ).toContain('AGENTS.md');

      const target = join(PACKAGES, dir, 'AGENTS.md');
      expect(
        existsSync(target),
        `${dir}: AGENTS.md missing, run npm run agents-md`,
      ).toBe(true);

      const load = loaderFor(dir);
      expect(load, `${dir}: no src/index.ts`).toBeTypeOf('function');
      const mod = await load!();
      const expected = await renderAgentsMd(
        factsFrom(pkg, mod as Record<string, unknown>),
        stack,
        target,
      );
      const actual = readFileSync(target, 'utf8');
      expect(actual.startsWith(AGENTS_MD_MARKER)).toBe(true);
      expect(actual, `${dir}/AGENTS.md is stale. Run: npm run agents-md`).toBe(
        expected,
      );
    },
  );

  it('names a real enable line and every preset the plugin exports', async () => {
    const dir = 'eslint-plugin-secure-coding';
    const text = readFileSync(join(PACKAGES, dir, 'AGENTS.md'), 'utf8');
    const mod = (await loaderFor(dir)!()) as {
      configs: Record<string, unknown>;
    };
    expect(text).toContain(
      "import secureCoding from 'eslint-plugin-secure-coding';",
    );
    expect(text).toContain('secureCoding.configs.recommended');
    for (const preset of Object.keys(mod.configs))
      expect(text).toContain(`\`${preset}\``);
    // A spread of a preset throws "not iterable"; the guide must never show one.
    for (const d of plugins)
      expect(readFileSync(join(PACKAGES, d, 'AGENTS.md'), 'utf8')).not.toMatch(
        /\.\.\.\w+\.configs/,
      );
  });

  it('does not offer a deprecated rule under "Rules in no preset"', async () => {
    const facts = factsFrom(
      { name: 'eslint-plugin-demo', description: 'd' },
      {
        rules: {
          live: { meta: { docs: { description: 'Live rule' } } },
          old: { meta: { deprecated: true, docs: { description: 'Old' } } },
        },
        configs: {},
      },
    );
    const text = await renderAgentsMd(facts, stack, '/nonexistent/AGENTS.md');
    expect(text).toContain('`live`');
    expect(text).not.toContain('`old`');
  });

  it('shows the @eslint/markdown setup for a preset that lints Markdown', () => {
    const text = readFileSync(
      join(PACKAGES, 'eslint-plugin-conventions', 'AGENTS.md'),
      'utf8',
    );
    expect(text).toContain('npm install --save-dev @eslint/markdown');
    expect(text).toContain(
      'export default [{ plugins: { markdown } }, conventions.configs.guidance];',
    );
    // Only that preset: the secure-coding guide names no Markdown setup.
    expect(
      readFileSync(
        join(PACKAGES, 'eslint-plugin-secure-coding', 'AGENTS.md'),
        'utf8',
      ),
    ).not.toContain('@eslint/markdown');
  });

  it('is published: the build copies it and the publish gate only admits the generated one', () => {
    const build = readFileSync(join(ROOT, 'scripts/build-package.ts'), 'utf8');
    const dropped =
      /DROPPED_FILE_ENTRIES = new Set\(\[([^\]]*)\]/.exec(build)?.[1] ?? '';
    expect(dropped).not.toContain('AGENTS.md');
    const gate = readFileSync(
      join(ROOT, 'scripts/check-published-artifacts.ts'),
      'utf8',
    );
    expect(gate).toContain('AGENTS_MD_MARKER');
  });
});

// The gate in scripts/check-published-artifacts.ts refuses a packed AGENTS.md
// without the generator's marker, but only after a release run has built and
// packed everything. This catches the same defect in the PR: any package, a
// plugin or not, that lists AGENTS.md in `files` must carry the marker.
describe('AGENTS.md in a published `files` list', () => {
  const shipping = readdirSync(PACKAGES)
    .filter((d) => existsSync(join(PACKAGES, d, 'package.json')))
    .filter((d) =>
      (
        JSON.parse(readFileSync(join(PACKAGES, d, 'package.json'), 'utf8'))
          .files ?? []
      ).includes('AGENTS.md'),
    )
    .sort();

  it('is not empty', () => {
    expect(shipping.length).toBeGreaterThanOrEqual(31);
  });

  it.each(shipping)('%s ships only the generated consumer guide', (dir) => {
    expect(
      readFileSync(join(PACKAGES, dir, 'AGENTS.md'), 'utf8'),
      `${dir}: AGENTS.md is in "files" but lacks the generator marker, so check-published-artifacts will fail the release`,
    ).toContain(AGENTS_MD_MARKER);
  });
});
