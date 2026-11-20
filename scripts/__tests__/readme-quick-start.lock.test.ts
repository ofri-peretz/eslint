/**
 * @provenBy {"file":"packages/eslint-plugin-secure-coding/README.md","find":"export default [configs.recommended];","replace":"export default [...secureCoding.configs.recommended];"}
 */

/*
 * The flat config a plugin README tells you to paste must load in ESLint.
 *
 * eslint-plugin-secure-coding's README said `export default
 * [...securePlugin.configs.recommended]` while `configs.recommended` is one object,
 * so the spread threw `TypeError: ... is not iterable` for every reader who pasted
 * it (34,911 downloads a month; README audit 2026-11-20). Nothing ran the snippet.
 *
 * This lock takes the first `js` fence under `## Getting Started` of every published
 * eslint-plugin-* README, checks it is the one shape the generator writes, and runs
 * it: the plugin is imported from this workspace (the vitest config aliases every
 * `eslint-plugin-*` to its source), the array the snippet exports goes to a real
 * ESLint instance, and the config ESLint computes for a file must enable rules of
 * that plugin. Locally built packages only; nothing is fetched from the registry.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const PACKAGES = path.join(ROOT, 'packages');

const published = fs
  .readdirSync(PACKAGES)
  .filter((d) => d.startsWith('eslint-plugin-'))
  .filter((d) => {
    const manifest = path.join(PACKAGES, d, 'package.json');
    return (
      fs.existsSync(path.join(PACKAGES, d, 'README.md')) &&
      !JSON.parse(fs.readFileSync(manifest, 'utf8')).private
    );
  })
  .sort();

/** The first `js` fence under `## Getting Started`, before the next `## ` heading. */
function quickStart(readme: string): string | null {
  const gs = readme.search(/^## Getting Started$/m);
  if (gs === -1) return null;
  const rest = readme.slice(gs + 3);
  const next = rest.search(/^## /m);
  const section = next === -1 ? rest : rest.slice(0, next);
  return /```js\n([\s\S]*?)```/.exec(section)?.[1] ?? null;
}

describe('every plugin README quick start loads in ESLint', () => {
  it('discovers the published plugins', () => {
    expect(published.length).toBeGreaterThanOrEqual(31);
  });

  it.each(published)(
    '%s: the Getting Started config is a working flat config',
    async (pkg) => {
      const readme = fs.readFileSync(
        path.join(PACKAGES, pkg, 'README.md'),
        'utf8',
      );
      const snippet = quickStart(readme);
      expect(snippet, 'no `js` fence under ## Getting Started').not.toBeNull();

      const m =
        /^import \{ configs \} from '([^']+)';\n\nexport default \[configs\.recommended\];\n$/m.exec(
          snippet!.replace(/^\/\/.*\n/, ''),
        );
      expect(
        m,
        `the snippet must import { configs } and export [configs.recommended], got:\n${snippet}`,
      ).not.toBeNull();
      expect(m![1]).toBe(pkg);

      // The named export, as the snippet imports it. The workspace alias loads the
      // TypeScript source; the published CommonJS builds were loaded through a real
      // `eslint.config.mjs` on ESLint 10 when this lock was added.
      const { configs } = await import(/* @vite-ignore */ pkg);
      const recommended = configs.recommended;
      // The reason the spread form threw.
      expect(Array.isArray(recommended)).toBe(false);

      const eslint = new ESLint({
        cwd: ROOT,
        overrideConfigFile: true,
        overrideConfig: [recommended],
      });
      const config = await eslint.calculateConfigForFile(
        path.join(ROOT, 'readme-quick-start.js'),
      );
      const prefix = pkg.replace(/^eslint-plugin-/, '');
      const enabled = Object.entries(config.rules ?? {}).filter(
        ([id, entry]) =>
          id.includes('/') &&
          (Array.isArray(entry) ? entry[0] : entry) !== 'off' &&
          (Array.isArray(entry) ? entry[0] : entry) !== 0,
      );
      expect(Object.keys(config.plugins ?? {}).length).toBeGreaterThan(0);
      expect(
        enabled.length,
        `${prefix}: recommended enables no plugin rules`,
      ).toBeGreaterThan(0);
    },
    60_000,
  );
});
