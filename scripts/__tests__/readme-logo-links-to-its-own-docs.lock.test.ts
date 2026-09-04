/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A plugin's README logo points at THAT plugin's docs.
 *
 * The npm page is where most people meet a plugin, and the Interlace logo at
 * the top of it used to link to the site root — so the one obvious thing to
 * click dropped the reader on a landing page and made them search for the
 * plugin they were already reading about.
 *
 * Each of the 30 plugin READMEs now links to its own docs page. The two facts
 * that can rot are pinned here:
 *
 *   the link points somewhere        — not the bare site root
 *   that somewhere is the RIGHT page — derived from the docs tree, so a plugin
 *                                      renamed or moved between the quality/
 *                                      and security/ sections is caught
 *
 * The UTM parameters are part of the link's contract (see UTM_PHILOSOPHY.md)
 * and must survive: `utm_campaign` names the package, which is how a click
 * from this README is told apart from every other referral.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const DOCS = join(ROOT, 'apps/docs/content/docs');
const SITE = 'https://eslint.interlace.tools';

/** package dir -> docs section, read from the docs tree rather than guessed. */
function docsSection(): Map<string, string> {
  const out = new Map<string, string>();
  for (const section of readdirSync(DOCS, { withFileTypes: true })) {
    if (!section.isDirectory()) continue;
    for (const entry of readdirSync(join(DOCS, section.name), {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory() || !entry.name.startsWith('plugin-')) continue;
      out.set(
        `eslint-plugin-${entry.name.slice('plugin-'.length)}`,
        section.name,
      );
    }
  }
  return out;
}

const SECTIONS = docsSection();

describe('a README logo links to its own plugin docs', () => {
  it('finds plugin docs pages to check against', () => {
    // Without this the whole suite would pass on an empty docs tree.
    expect(SECTIONS.size).toBeGreaterThan(20);
  });

  it.each([...SECTIONS.keys()].sort())('%s', (pkg) => {
    const readme = join(ROOT, 'packages', pkg, 'README.md');
    expect(existsSync(readme), `${pkg} has no README.md`).toBe(true);

    const src = readFileSync(readme, 'utf-8');
    const section = SECTIONS.get(pkg)!;
    const slug = pkg.slice('eslint-plugin-'.length);
    const expected = `${SITE}/docs/${section}/plugin-${slug}`;

    /*
     * The LOGO ANCHORS, selected by what they wrap — not "does this URL appear
     * anywhere in the file".
     *
     * Each README already carried an OG-image link to the same docs page, so a
     * substring check passed whether or not either logo pointed anywhere
     * useful. The lock would have gone green with both logos still aimed at
     * the site root, which is the exact failure it exists to catch.
     */
    const anchors = [
      ...src.matchAll(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g),
    ];
    const logoAnchors = anchors.filter(([, , inner]) =>
      inner.includes('alt="Interlace"'),
    );

    expect(
      logoAnchors.length,
      `${pkg}'s README should carry two Interlace logo anchors (header and ` +
        `footer); found ${logoAnchors.length}.`,
    ).toBe(2);

    for (const [, href] of logoAnchors) {
      expect(
        href,
        `${pkg}'s Interlace logo links to ${href} instead of its own docs ` +
          'page. The logo is the first thing a reader clicks on npm; pointing ' +
          'it at the site root makes them go looking for the plugin they are ' +
          'already reading about.',
      ).toBe(
        `${expected}?utm_source=github&utm_medium=referral&utm_campaign=${pkg}`,
      );
    }
  });
});
