/**
 * Typed analytics dispatcher for the /articles surface.
 *
 * Today this is a thin shim — every event is dispatched as a `CustomEvent`
 * on `window` and (in dev) logged to the console. A real provider (Vercel
 * Analytics, PostHog, etc.) plugs in by listening on the same channel.
 *
 * Design rules:
 * - Events are typed via `ArticlesEventMap`; `track()` is generic so a
 *   misspelled name fails the build.
 * - Respect DNT: navigator.doNotTrack === '1' suppresses dispatch.
 * - Respect Globalprivacycontrol when present.
 * - Server-safe: every code path no-ops outside the browser.
 */

export interface ArticlesEventMap {
  articles_search_submitted: { q: string; resultCount: number };
  articles_filter_applied: {
    tagsAdded: string[];
    tagsRemoved: string[];
    activeTags: string[];
    resultCount: number;
  };
  articles_sort_changed: {
    field: 'date' | 'reactions' | 'comments' | 'reading_time';
    direction: 'asc' | 'desc';
  };
  articles_card_clicked: {
    articleId: number;
    position: number;
    isFeatured: boolean;
    sourceParams: string;
  };
  articles_pagination: { from: number; to: number; totalPages: number };
  articles_subscribe_clicked: { channel: 'rss' | 'devto' | 'x' | 'github' };
  articles_empty_state_seen: { activeParams: string };
}

export type ArticlesEventName = keyof ArticlesEventMap;

const CHANNEL = 'interlace:articles';

function isTrackingAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  const dnt = navigator.doNotTrack;
  if (dnt === '1' || dnt === 'yes') return false;
  const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean })
    .globalPrivacyControl;
  if (gpc === true) return false;
  return true;
}

export function track<E extends ArticlesEventName>(
  event: E,
  payload: ArticlesEventMap[E],
): void {
  if (!isTrackingAllowed()) return;
  try {
    window.dispatchEvent(
      new CustomEvent(CHANNEL, { detail: { event, payload } }),
    );
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug(`[analytics] ${event}`, payload);
    }
  } catch {
    // Analytics must never break the UI.
  }
}
