'use client';

/**
 * `$pageview` capture on App Router route change for apps/registry.
 * Mirror of apps/docs.
 */
import { useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { posthog } from '@/lib/posthog-init';
import { consumeLandingUtm, isPlausibleDistinctId } from '@/lib/utm';
import { setVisitorProfileOnFirstPageview } from '@/lib/visitor-profile';
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
            // swallow
          }
        }
        setVisitorProfileOnFirstPageview({ utm, landingPath: pathname });
      } catch {
        // defensive
      }
    }
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
