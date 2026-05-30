/**
 * PostHog init for the docs surface.
 *
 * Internal to apps/docs — every Interlace property has its own copy with
 * its own `app` identifier per ANALYTICS_PHILOSOPHY.md ("no shared wrapper
 * package"). Duplication is intentional; enforcement is the philosophy doc
 * + ESLint rules in eslint-plugin-conventions, not a runtime import.
 *
 * Behaviour:
 * - Silent no-op if the env key is missing or empty.
 * - DNT / GPC short-circuit before init (ANALYTICS_PHILOSOPHY principle 9).
 * - Reverse-proxied via `/ingest` so the third-party host stays out of CSP
 *   (principle 2). Same-origin cookie, ad-blocker survival.
 * - Cross-subdomain cookie on `.interlace.tools` so identity stitches
 *   across docs / registry / storybook / landing without a hand-off
 *   (principle 8 case A).
 * - Manual `$pageview` — fired by the React component on App Router route
 *   change. `capture_pageview: false` prevents PostHog's own pageview
 *   logic from double-firing (principle 6).
 * - `$pageleave` enabled (`capture_pageleave: true`) — required for
 *   accurate Funnels and Paths.
 * - PostHog-as-platform (per ANALYTICS_PHILOSOPHY intro): session replay,
 *   web vitals, and exception capture are all enabled with safe defaults.
 *   Opt-out by setting `NEXT_PUBLIC_POSTHOG_DISABLE_REPLAY=1`.
 * - URL normalisation on every event via `before_send` strips consumed
 *   `utm_*` params + `ph_distinct_id` from `$current_url` (principle 7).
 */
import posthog, { type PostHogConfig } from 'posthog-js';

/** The surface that calls into PostHog from this app. */
export const APP_ID = 'eslint_docs' as const;

/**
 * Same-eTLD+1 cookie scope so `*.interlace.tools` shares one anonymous
 * `distinct_id`. `cross_subdomain_cookie: true` makes posthog-js set the
 * cookie domain to the eTLD+1 of the current page automatically (so on
 * `eslint.interlace.tools` it becomes `.interlace.tools` — no explicit
 * config needed). Documented here as the intended scope.
 */
const COOKIE_DOMAIN = '.interlace.tools';
void COOKIE_DOMAIN;

/**
 * URL params that we consume on the landing pageview and want stripped
 * from the captured `$current_url`. Stripping happens in PostHog's payload
 * only; the address-bar strip is handled by `consumeLandingUtm()` in
 * `lib/utm.ts`.
 */
const STRIP_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ph_distinct_id',
  'ref',
]);

function normaliseCurrentUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const k of STRIP_PARAMS) u.searchParams.delete(k);
    // Sort remaining keys so URL identity is canonical (DEEP_LINKING #6).
    const sorted = new URLSearchParams();
    for (const k of [...u.searchParams.keys()].sort()) {
      for (const v of u.searchParams.getAll(k)) sorted.append(k, v);
    }
    u.search = sorted.toString() ? `?${sorted.toString()}` : '';
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * True for localhost / 127.0.0.1 / .local — the developer's machine.
 * Local pageviews would pollute production cohorts and funnel counts,
 * so we hard-block by default. To test the integration locally, set
 * `localStorage.interlace_local_analytics = '1'` and reload.
 */
function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.localhost')
  );
}

function isLocalOptIn(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem('interlace_local_analytics') === '1';
  } catch {
    return false;
  }
}

function isTrackingAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof navigator === 'undefined') return false;
  // Local dev short-circuit (ANALYTICS_PHILOSOPHY principle 9).
  if (isLocalEnvironment() && !isLocalOptIn()) return false;
  const dnt = navigator.doNotTrack;
  if (dnt === '1' || dnt === 'yes') return false;
  const gpc = (
    navigator as Navigator & { globalPrivacyControl?: boolean }
  ).globalPrivacyControl;
  if (gpc === true) return false;
  return true;
}

let initialised = false;

export function initPostHog(): void {
  if (typeof window === 'undefined') return;
  if (initialised) return;
  if (!isTrackingAllowed()) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) {
    // Silent no-op in production; debug-log in dev so the absence is
    // obvious during local work.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug(
        '[posthog] NEXT_PUBLIC_POSTHOG_KEY is empty — analytics disabled',
      );
    }
    return;
  }

  const disableReplay = process.env.NEXT_PUBLIC_POSTHOG_DISABLE_REPLAY === '1';

  const config: Partial<PostHogConfig> = {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    capture_performance: true,
    capture_exceptions: true,
    autocapture: true,
    cross_subdomain_cookie: true,
    disable_session_recording: disableReplay,
    ...(disableReplay
      ? {}
      : {
          session_recording: {
            maskAllInputs: true,
            maskTextSelector: '[data-ph-mask]',
          },
        }),
    before_send: (event) => {
      if (!event) return event;
      try {
        const properties = event.properties as
          | Record<string, unknown>
          | undefined;
        if (properties && typeof properties['$current_url'] === 'string') {
          properties['$current_url'] = normaliseCurrentUrl(
            properties['$current_url'] as string,
          );
        }
        if (properties && typeof properties['$referrer'] === 'string') {
          properties['$referrer'] = normaliseCurrentUrl(
            properties['$referrer'] as string,
          );
        }
      } catch {
        // Never let normalisation block ingest.
      }
      return event;
    },
    loaded: (ph) => {
      try {
        ph.register({ app: APP_ID });
        if (
          typeof localStorage !== 'undefined' &&
          localStorage.getItem('interlace_internal') === '1'
        ) {
          ph.people.set({ is_internal_user: true });
        }
      } catch {
        // Defensive — never throw out of init.
      }
    },
  };

  try {
    posthog.init(key, config);
    initialised = true;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[posthog] init failed', err);
    }
  }
}

export { posthog };
