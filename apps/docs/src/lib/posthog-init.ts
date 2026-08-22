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
 * Kept only as documentation of intended scope. `cross_subdomain_cookie: true`
 * below is a no-op while `cookieless_mode` is active — cookieless mode writes
 * no cookie at all, so there is no cookie to scope. It stays set because it is
 * the correct value the moment cookieless mode is ever turned off.
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

/**
 * Browser noise that is not an application error.
 *
 * "ResizeObserver loop completed with undelivered notifications" is emitted by
 * the browser itself when an observer callback dirties layout in the same
 * frame. It is unactionable, and it arrives in bursts — a single Safari
 * session produced 27 of them here, which is enough to outrank every real bug
 * in the error inbox.
 *
 * "Script error." is the opaque cross-origin placeholder: no stack, no file,
 * no message. There is nothing to fix and no way to tell two of them apart.
 *
 * Dropped at source rather than triaged forever, so the inbox keeps meaning
 * "something is broken".
 */
const NOISY_EXCEPTIONS: RegExp[] = [
  /^ResizeObserver loop/i,
  /^Script error\.?$/i,
];

function isNoisyException(properties?: Record<string, unknown>): boolean {
  const list = properties?.['$exception_list'];
  if (!Array.isArray(list) || list.length === 0) return false;
  const value = (list[0] as { value?: unknown } | undefined)?.value;
  return typeof value === 'string' && NOISY_EXCEPTIONS.some((re) => re.test(value));
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
    // Cookieless mode: PostHog sets no cookie and touches no local or session
    // storage, so no GDPR consent banner is required — and, unlike the
    // `persistence: 'memory'` this replaces, identity is not thrown away.
    //
    // `persistence: 'memory'` meant every page load was a brand new anonymous
    // person: 2,254 pageviews across 1,863 "people" in 30 days, 1.2 pageviews
    // each, which made funnels, paths, retention, and session replay measure
    // nothing. Cookieless mode instead derives identity from a
    // privacy-preserving hash computed on PostHog's servers, so sessions and
    // people are real again with no client-side storage.
    //
    // REQUIRES `cookieless_server_hash_mode` on the PostHog project (set to 2,
    // Stateful, on 2026-08-22). Without it every cookieless event is silently
    // DROPPED — the two must be changed together, project setting first.
    cookieless_mode: 'always',
    capture_pageview: false,
    capture_pageleave: true,
    capture_performance: true,
    capture_exceptions: true,
    // Heatmaps + scrollmaps: `$heatmap` events power the toolbar overlay on
    // docs pages, where "did anyone scroll far enough to see the CTA?" is the
    // question autocapture cannot answer. Requires Heatmaps enabled in the
    // PostHog project settings for the overlay UI to render.
    capture_heatmaps: true,
    // Dead clicks: a click on something that looks interactive and does
    // nothing. On a docs site that is the highest-signal UX defect there is
    // (a non-copyable code block, a badge that reads like a link).
    capture_dead_clicks: true,
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
      if (
        event.event === '$exception' &&
        isNoisyException(event.properties as Record<string, unknown> | undefined)
      )
        return null;
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
