/**
 * Lock: every rule's `meta.docs.url` must point at the canonical docs site.
 *
 * Regression guard. Until 2026-08-11 all rules inherited devkit's placeholder URL
 * (`github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin/docs/rules/<name>.md`),
 * a path that has never existed — so every "see docs" link in every IDE, CI report and
 * SARIF file returned 404, across all three published security plugins. The docs slug
 * MUST equal the package suffix; any other shape 404s on the live site.
 */
import { describe, expect, it } from 'vitest';
import { rules } from './index';

const SLUG = 'plugin-browser-security';

describe('eslint-plugin-browser-security docs URLs', () => {
  it('points every rule at the canonical docs site', () => {
    const broken = Object.entries(rules)
      .map(([name, rule]) => [name, rule.meta?.docs?.url] as const)
      .filter(
        ([name, url]) =>
          url !== `https://eslint.interlace.tools/docs/security/${SLUG}/rules/${name}`,
      );
    expect(broken).toEqual([]);
  });

  it('never ships the placeholder path that 404s', () => {
    const placeholders = Object.values(rules).filter((rule) =>
      rule.meta?.docs?.url?.includes('packages/eslint-plugin/docs'),
    );
    expect(placeholders).toHaveLength(0);
  });
});
