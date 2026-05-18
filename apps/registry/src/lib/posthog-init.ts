/**
 * PostHog init for apps/registry (ds.interlace.tools).
 *
 * Per-property duplicate of the shared contract; identical to apps/docs
 * except for the `APP_ID`. See ANALYTICS_PHILOSOPHY.md (no shared
 * wrapper package).
 */
import posthog, { type PostHogConfig } from 'posthog-js';

export const APP_ID = 'ds' as const;

// Same-eTLD+1 cookie scope so `*.interlace.tools` shares one anon id.
// `cross_subdomain_cookie: true` makes posthog-js set the cookie domain
// to the page's eTLD+1 automatically.
const COOKIE_DOMAIN = '.interlace.tools';
void COOKIE_DOMAIN;

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

function isTrackingAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof navigator === 'undefined') return false;
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
        const props = event.properties as Record<string, unknown> | undefined;
        if (props && typeof props['$current_url'] === 'string') {
          props['$current_url'] = normaliseCurrentUrl(
            props['$current_url'] as string,
          );
        }
        if (props && typeof props['$referrer'] === 'string') {
          props['$referrer'] = normaliseCurrentUrl(props['$referrer'] as string);
        }
      } catch {
        // never block ingest
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
        // never throw
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
