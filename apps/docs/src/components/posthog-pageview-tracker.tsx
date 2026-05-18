'use client';

/**
 * Capture a `$pageview` on every App Router route change.
 *
 * Implementation notes (best practice per the PostHog Next.js App Router
 * guide):
 * - Wrapped in `<Suspense>` because `useSearchParams()` triggers a
 *   client-side bailout outside of Suspense in static prerender.
 * - Fires exactly once per route change (ANALYTICS_PHILOSOPHY #6).
 * - On the first mount (landing), consumes UTM + `ph_distinct_id`, sets
 *   first-touch visitor profile, and strips the params from the address
 *   bar before capturing.
 * - Cross-eTLD+1 identity hand-off: if `?ph_distinct_id=` is present,
 *   call `posthog.identify(id)` so the journey is one person across
 *   `ofriperetz.dev` ↔ `*.interlace.tools`.
 */
import { useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { posthog } from '@/lib/posthog-init';
import { consumeLandingUtm, isPlausibleDistinctId } from '@/lib/utm';
import {
  setVisitorProfileOnFirstPageview,
  updateDepthSignals,
} from '@/lib/visitor-profile';
import { pageview } from '@/lib/analytics';

function PageviewTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firstMount = useRef(true);

  useEffect(() => {
    if (!pathname) return;

    if (firstMount.current) {
      firstMount.current = false;
      try {
        const utm = consumeLandingUtm();
        if (isPlausibleDistinctId(utm.phDistinctId)) {
          try {
            posthog.identify?.(utm.phDistinctId as string);
          } catch {
            // Swallow — analytics never throws.
          }
        }
        setVisitorProfileOnFirstPageview({ utm, landingPath: pathname });
      } catch {
        // Defensive.
      }
    }

    updateDepthSignals(pathname);

    let url = pathname;
    const search = searchParams?.toString() ?? '';
    if (search) url += `?${search}`;
    const absolute =
      typeof window !== 'undefined' ? window.location.origin + url : url;
    pageview(absolute);
  }, [pathname, searchParams]);

  return null;
}

export function PostHogPageviewTracker() {
  return (
    <Suspense fallback={null}>
      <PageviewTrackerInner />
    </Suspense>
  );
}
