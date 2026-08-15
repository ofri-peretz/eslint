/**
 * Lock: the local-preview setup names no vendor.
 *
 * A sandbox provider opened two PRs that wired itself into the repo — a
 * `.base44/` config directory, a `docker-compose.base44.yml`, a vendor section
 * in AGENTS.md, and, in `apps/docs/next.config.mjs`, an `allowedDevOrigins`
 * built from that provider's own env-var name with a hardcoded `3000-` prefix.
 * The build configuration of this repo is not a place for one vendor's
 * spelling: we experiment with providers, we do not adopt their identifiers.
 *
 * The neutral hook is `DEV_ALLOWED_ORIGINS` — comma-separated, dev-only, empty
 * by default. Any sandbox sets it and nothing here learns who they are.
 *
 * This test fails on the next such commit rather than on the next review.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');
const NEXT_CONFIG = join(REPO_ROOT, 'apps', 'docs', 'next.config.mjs');

/**
 * Providers whose scaffolding has been proposed and declined. Add to this list
 * when another one is turned down; the point is the general rule, and these are
 * the concrete cases that prove it is being applied.
 */
const DECLINED_VENDORS = ['base44'];

describe('local preview stays vendor-neutral', () => {
  it('drives allowedDevOrigins from the generic env var', () => {
    const config = readFileSync(NEXT_CONFIG, 'utf8');

    expect(config).toContain('DEV_ALLOWED_ORIGINS');
    // A hardcoded port prefix bakes one provider's URL scheme into our config.
    expect(config).not.toMatch(/allowedDevOrigins[\s\S]{0,400}`\d+-\$\{/);
  });

  it('names no declined vendor in the build or preview configuration', () => {
    const surfaces = [
      NEXT_CONFIG,
      join(REPO_ROOT, 'compose.dev.yml'),
      join(REPO_ROOT, 'Dockerfile'),
    ].filter((path) => existsSync(path));

    // AGENTS.md may name a vendor while explaining why it was declined; the
    // configuration files may not name one at all.
    for (const path of surfaces) {
      const text = readFileSync(path, 'utf8').toLowerCase();
      for (const vendor of DECLINED_VENDORS) {
        expect(text, `${path} names "${vendor}"`).not.toContain(vendor);
      }
    }
  });

  it('carries no vendor-owned config directory or compose file', () => {
    for (const entry of readdirSync(REPO_ROOT)) {
      const name = entry.toLowerCase();
      for (const vendor of DECLINED_VENDORS) {
        expect(name, `repo root contains "${entry}"`).not.toContain(vendor);
      }
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
