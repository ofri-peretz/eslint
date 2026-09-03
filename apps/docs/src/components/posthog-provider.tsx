'use client';

/**
 * Mounts the PostHog client and wraps the React tree with PostHog's
 * provider so feature flags, surveys, and `usePostHog()` work in
 * descendant components.
 *
 * Safe to render even when analytics is disabled (missing env key, DNT,
 * GPC) — `initPostHog()` short-circuits, and the provider works with the
 * default-no-op posthog instance.
 *
 * Pageviews are captured by the sibling `<PostHogPageviewTracker />`,
 * not by this provider — see ANALYTICS_PHILOSOPHY principle 6
 * (pageview-exactly-once on route change).
 */
import { type ReactNode, useEffect } from 'react';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { initPostHog, posthog } from '@/lib/posthog-init';

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
