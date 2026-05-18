/**
 * PostHog Provider Lock Tests
 *
 * Refuses to ship if:
 *   - The root layout (src/app/layout.tsx) no longer wraps with
 *     <PostHogProvider> + <PostHogPageviewTracker>.
 *   - The opinionated init contract (ANALYTICS_PHILOSOPHY.md) is missing
 *     from src/lib/posthog-init.ts (reverse-proxied api_host, manual
 *     pageview, cross-subdomain cookie, DNT/GPC guard, before_send
 *     normaliser).
 *   - The Next.js reverse-proxy rewrite from /ingest/* is removed from
 *     next.config.mjs.
 *
 * These are structural checks — they read files as strings, no
 * full-bundle render. Cheap to run, hard to bypass accidentally.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve from this file so the test passes whether vitest is run from
// the workspace root or from inside apps/docs.
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const layoutPath = join(ROOT, 'src/app/layout.tsx');
const initPath = join(ROOT, 'src/lib/posthog-init.ts');
const analyticsPath = join(ROOT, 'src/lib/analytics.ts');
const utmPath = join(ROOT, 'src/lib/utm.ts');
const visitorProfilePath = join(ROOT, 'src/lib/visitor-profile.ts');
const providerPath = join(ROOT, 'src/components/posthog-provider.tsx');
const trackerPath = join(ROOT, 'src/components/posthog-pageview-tracker.tsx');
const nextConfigPath = join(ROOT, 'next.config.mjs');
const envExamplePath = join(ROOT, '.env.example');

let layoutSrc = '';
let initSrc = '';
let analyticsSrc = '';
let utmSrc = '';
let visitorSrc = '';
let providerSrc = '';
let trackerSrc = '';
let nextConfigSrc = '';
let envExampleSrc = '';

beforeAll(() => {
  layoutSrc = readFileSync(layoutPath, 'utf-8');
  initSrc = readFileSync(initPath, 'utf-8');
  analyticsSrc = readFileSync(analyticsPath, 'utf-8');
  utmSrc = readFileSync(utmPath, 'utf-8');
  visitorSrc = readFileSync(visitorProfilePath, 'utf-8');
  providerSrc = readFileSync(providerPath, 'utf-8');
  trackerSrc = readFileSync(trackerPath, 'utf-8');
  nextConfigSrc = readFileSync(nextConfigPath, 'utf-8');
  envExampleSrc = readFileSync(envExamplePath, 'utf-8');
});

describe('PostHog: File Layout', () => {
  it('posthog-init.ts exists at src/lib/', () => {
    expect(existsSync(initPath)).toBe(true);
  });
  it('analytics.ts (typed primitives) exists at src/lib/', () => {
    expect(existsSync(analyticsPath)).toBe(true);
  });
  it('utm.ts exists at src/lib/', () => {
    expect(existsSync(utmPath)).toBe(true);
  });
  it('visitor-profile.ts exists at src/lib/', () => {
    expect(existsSync(visitorProfilePath)).toBe(true);
  });
  it('posthog-provider client component exists', () => {
    expect(existsSync(providerPath)).toBe(true);
  });
  it('posthog-pageview-tracker client component exists', () => {
    expect(existsSync(trackerPath)).toBe(true);
  });
  it('.env.example documents NEXT_PUBLIC_POSTHOG_KEY', () => {
    expect(envExampleSrc).toMatch(/NEXT_PUBLIC_POSTHOG_KEY/);
  });
});

describe('PostHog: Layout integration', () => {
  it('root layout imports PostHogProvider', () => {
    expect(layoutSrc).toMatch(
      /from\s+['"]@\/components\/posthog-provider['"]/,
    );
  });
  it('root layout imports PostHogPageviewTracker', () => {
    expect(layoutSrc).toMatch(
      /from\s+['"]@\/components\/posthog-pageview-tracker['"]/,
    );
  });
  it('root layout wraps children with <PostHogProvider>', () => {
    expect(layoutSrc).toMatch(/<PostHogProvider>/);
    expect(layoutSrc).toMatch(/<\/PostHogProvider>/);
  });
  it('root layout mounts <PostHogPageviewTracker />', () => {
    expect(layoutSrc).toMatch(/<PostHogPageviewTracker\s*\/>/);
  });
});

describe('PostHog: Init contract (ANALYTICS_PHILOSOPHY.md)', () => {
  it('uses the same-origin reverse proxy (api_host: "/ingest")', () => {
    expect(initSrc).toMatch(/api_host:\s*['"]\/ingest['"]/);
  });
  it('manual pageview capture (capture_pageview: false)', () => {
    expect(initSrc).toMatch(/capture_pageview:\s*false/);
  });
  it('pageleave capture enabled (capture_pageleave: true)', () => {
    expect(initSrc).toMatch(/capture_pageleave:\s*true/);
  });
  it('web vitals enabled (capture_performance: true)', () => {
    expect(initSrc).toMatch(/capture_performance:\s*true/);
  });
  it('exception capture enabled (capture_exceptions: true)', () => {
    expect(initSrc).toMatch(/capture_exceptions:\s*true/);
  });
  it('cross-subdomain cookie on .interlace.tools', () => {
    expect(initSrc).toMatch(/cross_subdomain_cookie:\s*true/);
    expect(initSrc).toMatch(/['"]\.interlace\.tools['"]/);
  });
  it('DNT / GPC short-circuit before init', () => {
    expect(initSrc).toMatch(/doNotTrack/);
    expect(initSrc).toMatch(/globalPrivacyControl/);
  });
  it('default `app` property is registered on load', () => {
    expect(initSrc).toMatch(/register\(\{\s*app:/);
  });
  it('before_send normalises $current_url (strips utm_*)', () => {
    expect(initSrc).toMatch(/before_send/);
    expect(initSrc).toMatch(/utm_source/);
  });
});

describe('PostHog: UTM contract (UTM_PHILOSOPHY.md)', () => {
  it('utm.ts exports buildUtmHref', () => {
    expect(utmSrc).toMatch(/export function buildUtmHref/);
  });
  it('utm.ts exports consumeLandingUtm', () => {
    expect(utmSrc).toMatch(/export function consumeLandingUtm/);
  });
  it('UtmSource is a typed union (fixed taxonomy)', () => {
    expect(utmSrc).toMatch(/export type UtmSource/);
    expect(utmSrc).toMatch(/['"]ofriperetz_dev['"]/);
    expect(utmSrc).toMatch(/['"]eslint_docs['"]/);
  });
  it('UtmMedium is a typed union (fixed taxonomy)', () => {
    expect(utmSrc).toMatch(/export type UtmMedium/);
    expect(utmSrc).toMatch(/['"]blog['"]/);
    expect(utmSrc).toMatch(/['"]docs['"]/);
  });
  it('consumeLandingUtm uses replaceState to strip the address bar', () => {
    expect(utmSrc).toMatch(/history\.replaceState/);
  });
});

describe('PostHog: Visitor-profile contract', () => {
  it('VisitorProfile vocabulary is fixed', () => {
    for (const v of [
      'developer',
      'engineering_leader',
      'recruiter',
      'investor',
      'founder',
      'student',
      'curious',
      'unknown',
    ]) {
      expect(visitorSrc).toMatch(new RegExp(`['"]${v}['"]`));
    }
  });
  it('first-touch person properties go through $set_once', () => {
    expect(visitorSrc).toMatch(/set_once/);
    expect(visitorSrc).toMatch(/first_visitor_profile/);
  });
});

describe('PostHog: Analytics primitives (vendor-neutral surface)', () => {
  it('analytics.ts exports identify primitive', () => {
    expect(analyticsSrc).toMatch(/export function identify/);
  });
  it('analytics.ts exports track primitive', () => {
    expect(analyticsSrc).toMatch(/export function track/);
  });
  it('analytics.ts exports pageview primitive', () => {
    expect(analyticsSrc).toMatch(/export function pageview/);
  });
  it('every event in TrackedEventMap follows category:object_action', () => {
    // The event keys live between the open `{` and the close `}` of the
    // TrackedEventMap interface declaration. Pull them out and check each.
    const mapMatch = analyticsSrc.match(
      /export interface TrackedEventMap\s*\{([\s\S]*?)\n\}/,
    );
    expect(mapMatch).not.toBeNull();
    const keys = (mapMatch?.[1] ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith("'") || l.startsWith('"'))
      .map((l) => l.replace(/^['"]([^'"]+)['"].*$/, '$1'));
    expect(keys.length).toBeGreaterThan(0);
    const grammar =
      /^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*_(click|submit|view|add|remove|start|end|generate|send|cancel|fail|create|delete|update|invite)$/;
    for (const k of keys) {
      expect(k, `Event key "${k}" violates category:object_action grammar`).toMatch(
        grammar,
      );
    }
  });
});

describe('PostHog: Next.js reverse proxy', () => {
  it('next.config.mjs rewrites /ingest/* to PostHog ingestion', () => {
    expect(nextConfigSrc).toMatch(/\/ingest\//);
    expect(nextConfigSrc).toMatch(/us\.i\.posthog\.com/);
  });
  it('next.config.mjs rewrites /ingest/static/* to PostHog assets', () => {
    expect(nextConfigSrc).toMatch(/us-assets\.i\.posthog\.com/);
  });
});

describe('PostHog: Provider + Tracker shape', () => {
  it('provider is a client component', () => {
    expect(providerSrc).toMatch(/^['"]use client['"]/);
  });
  it("provider calls initPostHog from useEffect", () => {
    expect(providerSrc).toMatch(/initPostHog\(\)/);
  });
  it('tracker is a client component', () => {
    expect(trackerSrc).toMatch(/^['"]use client['"]/);
  });
  it('tracker reads usePathname + useSearchParams from next/navigation', () => {
    expect(trackerSrc).toMatch(/from\s+['"]next\/navigation['"]/);
    expect(trackerSrc).toMatch(/usePathname/);
    expect(trackerSrc).toMatch(/useSearchParams/);
  });
  it('tracker wraps the inner component in <Suspense>', () => {
    expect(trackerSrc).toMatch(/<Suspense\b/);
  });
});
