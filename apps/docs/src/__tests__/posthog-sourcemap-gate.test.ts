/**
 * Behavioural lock for the source-map upload gate in next.config.mjs.
 *
 * The sibling posthog-provider-lock test reads the config as a string, which
 * proves the option is written down but not that the gate works. This one
 * loads the config module for real under three env states and asserts what
 * actually comes out:
 *
 *   - neither credential  -> config untouched (today's production behaviour)
 *   - one credential      -> still untouched; the gate needs BOTH, and a
 *                            half-configured build must not start uploading
 *   - wrong kind of key   -> still untouched; a `phc_` project key is set but
 *                            unusable, and the uploader rejecting it used to
 *                            fail the whole deploy
 *   - both, right kind    -> wrapper engaged
 *
 * Plus the invariant that matters most: `productionBrowserSourceMaps` is never
 * true in any state, because that is the switch that would publish our sources
 * to every visitor instead of handing them privately to PostHog.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

const CREDENTIAL_KEYS = [
  'POSTHOG_PERSONAL_API_KEY',
  'POSTHOG_PROJECT_ID',
] as const;

type NextConfigLike = {
  webpack?: unknown;
  productionBrowserSourceMaps?: unknown;
};

const original = new Map<string, string | undefined>(
  CREDENTIAL_KEYS.map((k) => [k, process.env[k]]),
);

/**
 * Loads next.config.mjs fresh under the given env. `vi.resetModules()` drops
 * the cached copy so the gate is re-evaluated against the new process.env
 * rather than replayed from the first import.
 */
async function loadConfig(
  env: Partial<Record<(typeof CREDENTIAL_KEYS)[number], string>>,
): Promise<NextConfigLike> {
  for (const k of CREDENTIAL_KEYS) delete process.env[k];
  Object.assign(process.env, env);
  vi.resetModules();
  const mod = await import('../../next.config.mjs');
  return mod.default as NextConfigLike;
}

afterEach(() => {
  for (const [k, v] of original) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe('PostHog: source-map upload gate', () => {
  it('leaves the config untouched when neither credential is set', async () => {
    const config = await loadConfig({});
    // The unwrapped object still exposes its own keys.
    expect(Object.keys(config)).toContain('webpack');
    expect(config.productionBrowserSourceMaps).not.toBe(true);
  });

  it('leaves the config untouched when only one credential is set', async () => {
    const keyOnly = await loadConfig({
      POSTHOG_PERSONAL_API_KEY: 'phx_test-key',
    });
    expect(Object.keys(keyOnly)).toContain('webpack');

    const projectOnly = await loadConfig({ POSTHOG_PROJECT_ID: '428927' });
    expect(Object.keys(projectOnly)).toContain('webpack');
  });

  it('leaves the config untouched for a key of the wrong kind', async () => {
    // `phc_` is the *project* key: public by design, and unable to authorise
    // an upload. Setting it here is a live mistake on
    // serverless.interlace.tools, where the uploader rejected it and failed
    // the production deploy. A nicety must not be able to do that.
    const wrongKind = await loadConfig({
      POSTHOG_PERSONAL_API_KEY: 'phc_project_key_not_personal',
      POSTHOG_PROJECT_ID: '428927',
    });
    expect(Object.keys(wrongKind)).toContain('webpack');
    expect(wrongKind.productionBrowserSourceMaps).not.toBe(true);
  });

  it('engages the wrapper when both credentials are set', async () => {
    const off = await loadConfig({});
    const on = await loadConfig({
      POSTHOG_PERSONAL_API_KEY: 'phx_test-key',
      POSTHOG_PROJECT_ID: '428927',
    });
    expect(String(on.webpack)).not.toBe(String(off.webpack));
    // Still never the switch that would serve maps to visitors.
    expect(on.productionBrowserSourceMaps).not.toBe(true);
  });
});
