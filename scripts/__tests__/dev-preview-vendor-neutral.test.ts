/**
 * Lock: the local-preview setup names no vendor.
 *
 * Sandboxes are welcome; they are overlays under `sandboxes/`, plus whatever
 * root path the provider's platform requires. What they may not do is become
 * the way this project runs.
 *
 * The case that prompted this: a provider opened two PRs putting an
 * `allowedDevOrigins` in `apps/docs/next.config.mjs` built from its own env-var
 * name with a hardcoded `3000-` prefix, alongside a `docker-compose.base44.yml`
 * as the entry point. That makes the project's setup theirs. The neutral hook is
 * `DEV_ALLOWED_ORIGINS` — comma-separated, dev-only, empty by default — and the
 * overlay translates the provider's environment into it.
 *
 * So the boundary is a location, not a prohibition: a provider's name may appear
 * in its own overlay and nowhere else. That is what makes trying one cheap and
 * leaving one free.
 *
 * This test fails on the next such commit rather than on the next review.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');
const NEXT_CONFIG = join(REPO_ROOT, 'apps', 'docs', 'next.config.mjs');

/**
 * Sandbox providers with an overlay in the repo. Add a provider here when its
 * overlay lands: the name is then permitted under `sandboxes/<provider>/` and in
 * the root path its platform requires, and forbidden everywhere else.
 */
const SANDBOX_VENDORS = ['base44'];

/** Root entries a provider's platform requires, which are therefore allowed. */
const ALLOWED_VENDOR_ROOT_ENTRIES = new Set(['.base44']);

describe('local preview stays vendor-neutral', () => {
  it('drives allowedDevOrigins from the generic env var', () => {
    const config = readFileSync(NEXT_CONFIG, 'utf8');

    expect(config).toContain('DEV_ALLOWED_ORIGINS');
    // A hardcoded port prefix bakes one provider's URL scheme into our config.
    expect(config).not.toMatch(/allowedDevOrigins[\s\S]{0,400}`\d+-\$\{/);
  });

  it('names no sandbox vendor in the build or preview configuration', () => {
    const surfaces = [
      NEXT_CONFIG,
      join(REPO_ROOT, 'compose.dev.yml'),
      join(REPO_ROOT, 'Dockerfile'),
    ].filter((path) => existsSync(path));

    // AGENTS.md may name a vendor while explaining why it was declined; the
    // configuration files may not name one at all.
    for (const path of surfaces) {
      const text = readFileSync(path, 'utf8').toLowerCase();
      for (const vendor of SANDBOX_VENDORS) {
        expect(text, `${path} names "${vendor}" — that belongs in its overlay`).not.toContain(
          vendor,
        );
      }
    }
  });

  it('keeps vendor-named root entries to the ones a platform requires', () => {
    for (const entry of readdirSync(REPO_ROOT)) {
      if (ALLOWED_VENDOR_ROOT_ENTRIES.has(entry)) continue;
      const name = entry.toLowerCase();
      for (const vendor of SANDBOX_VENDORS) {
        expect(
          name,
          `repo root contains "${entry}" — a sandbox belongs in sandboxes/${vendor}/`,
        ).not.toContain(vendor);
      }
    }
  });

  it('gives every sandbox an overlay that layers on the repo-owned compose file', () => {
    // An overlay REPLACING compose.dev.yml would make the provider the setup
    // again, just one directory further away.
    for (const vendor of SANDBOX_VENDORS) {
      const overlay = join(REPO_ROOT, 'sandboxes', vendor, 'compose.override.yml');
      expect(existsSync(overlay), `sandboxes/${vendor}/compose.override.yml is missing`).toBe(true);

      const text = readFileSync(overlay, 'utf8');
      // It translates into the generic hook rather than configuring the app itself.
      expect(text).toContain('DEV_ALLOWED_ORIGINS');
      expect(text).not.toContain('image:');
      expect(text).not.toContain('command:');
    }
  });

  it('keeps a plain, portable way to run the preview', () => {
    // The container is a convenience. If the only documented path needed Docker
    // or a provider account, that would itself be a form of lock-in.
    const docsPkg = JSON.parse(
      readFileSync(join(REPO_ROOT, 'apps', 'docs', 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };

    expect(docsPkg.scripts.dev).toContain('next dev');
    expect(docsPkg.scripts.dev).toContain('3000');
  });
});
