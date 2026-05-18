/**
 * PostHog init for the Storybook manager surface.
 *
 * Manager-only — never injected into the preview iframe (per-story
 * tracking would explode event volume for no signal per
 * ANALYTICS_PHILOSOPHY principle 6).
 *
 * Captures:
 * - `$pageview` on manager mount.
 * - `storybook:story_view` on every story-render channel event.
 *
 * Silent no-op when env key is missing, DNT/GPC, or running in a
 * non-browser context (e.g. Vitest CI build of the manager bundle).
 */
import posthog, { type PostHogConfig } from 'posthog-js';

const APP_ID = 'storybook' as const;
// `cross_subdomain_cookie: true` makes posthog set the cookie on
// `.interlace.tools` automatically (the page's eTLD+1).
const COOKIE_DOMAIN = '.interlace.tools';
void COOKIE_DOMAIN;

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

function getKey(): string | null {
  // Vite injects import.meta.env.* at build time; Storybook's manager
  // bundle exposes the same set via `process.env` in the legacy mode but
  // we don't rely on that. We accept either, prefer import.meta.env.
  try {
    const m = (
      import.meta as ImportMeta & {
        env?: Record<string, string | undefined>;
      }
    ).env;
    const key =
      m?.VITE_POSTHOG_KEY ??
      m?.STORYBOOK_POSTHOG_KEY ??
      (typeof process !== 'undefined'
        ? process.env?.STORYBOOK_POSTHOG_KEY
        : undefined);
    return key?.trim() || null;
  } catch {
    return null;
  }
}

let initialised = false;

export function initStorybookPostHog(): typeof posthog | null {
  if (initialised) return posthog;
  if (!isTrackingAllowed()) return null;
  const key = getKey();
  if (!key) return null;
  const config: Partial<PostHogConfig> = {
    api_host: 'https://us.i.posthog.com',
    ui_host: 'https://us.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    capture_performance: true,
    capture_exceptions: true,
    autocapture: false,
    cross_subdomain_cookie: true,
    disable_session_recording: true,
    loaded: (ph) => {
      try {
        ph.register({ app: APP_ID });
      } catch {
        // never throw
      }
    },
  };
  try {
    posthog.init(key, config);
    initialised = true;
    return posthog;
  } catch {
    return null;
  }
}

export function trackManagerEvent(
  name: string,
  payload: Record<string, unknown>,
): void {
  if (!initialised) return;
  try {
    posthog.capture(name, payload);
  } catch {
    // swallow
  }
}

export function trackManagerPageview(extra?: Record<string, unknown>): void {
  if (!initialised) return;
  try {
    posthog.capture('$pageview', {
      $current_url:
        typeof window !== 'undefined' ? window.location.href : undefined,
      ...extra,
    });
  } catch {
    // swallow
  }
}
