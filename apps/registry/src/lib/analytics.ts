/**
 * Vendor-neutral analytics primitives for apps/registry.
 *
 * `identify` / `track` / `pageview` backed by PostHog. No typed events
 * yet — extend `TrackedEventMap` when registry surfaces grow business
 * events.
 */
import { posthog } from './posthog-init';

export interface TrackedEventMap {
  // Empty for now. Add `<category>:<object>_<verb>` entries here.
  [eventName: string]: never;
}

export type TrackedEventName = keyof TrackedEventMap;

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

function safe<T>(fn: () => T, fallback?: T): T | undefined {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function track<E extends TrackedEventName>(
  event: E,
  payload: TrackedEventMap[E],
): void {
  if (!isTrackingAllowed()) return;
  safe(() => {
    posthog.capture?.(event, payload as Record<string, unknown>);
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug(`[analytics] track ${event}`, payload);
    }
  });
}

export function identify(
  distinctId: string,
  properties?: Record<string, unknown>,
): void {
  if (!isTrackingAllowed()) return;
  if (!distinctId) return;
  safe(() => {
    posthog.identify?.(distinctId, properties);
  });
}

export function pageview(
  url?: string,
  properties?: Record<string, unknown>,
): void {
  if (!isTrackingAllowed()) return;
  safe(() => {
    const $current_url =
      url ?? (typeof window !== 'undefined' ? window.location.href : '');
    posthog.capture?.('$pageview', { $current_url, ...properties });
  });
}
