/**
 * Lock for the Dev.to auth-failure visibility contract.
 *
 * The 401→public fallback ran silently inside "success" jobs for months
 * while /stats showed REACH 0 over 86 reactions — the secret existed but
 * its value was rejected, and the only trace was a console.warn nobody
 * reads. The contract: the fallback must emit a GitHub Actions ::warning
 * annotation so a bad key surfaces on the run summary itself.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(join(__dirname, '../../scripts/update-articles-data.ts'), 'utf-8');

describe('update-articles-data auth-failure visibility', () => {
  it('the 401 fallback emits a ::warning annotation', () => {
    const fallback = SRC.slice(SRC.indexOf('status === 401'));
    expect(fallback).toContain('::warning title=Dev.to auth failed::');
  });

  it('authenticated endpoint is used when the key is present', () => {
    expect(SRC).toContain("process.env.DEV_TO_API_KEY");
    expect(SRC).toContain('https://dev.to/api/articles/me/all');
  });
});
