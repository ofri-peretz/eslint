'use client';

/**
 * Mounts the conversion measurement from `lib/conversion.ts`: one capture-phase
 * click listener on the document (GitHub / npm links, code-block copy buttons)
 * and, on rule pages only, a scroll-depth listener that fires at 50% and 90%.
 *
 * A single delegated listener rather than `onClick` on each link and block:
 * the copy button is rendered by fumadocs (its markup is not ours to depend on),
 * the links live in MDX, in the nav and in README content fetched at build, and
 * 500+ rule pages would otherwise each need their own wiring.
 *
 * Gating is not repeated here. `track()` returns on DNT / GPC and posthog-js
 * stays uninitialised in local dev, under automation and on `*.vercel.app`.
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import {
  track,
  type TrackedEventName,
  type TrackedEventMap,
} from '@/lib/analytics';
import {
  createScrollDepthTracker,
  handleConversionClick,
  pageKind,
} from '@/lib/conversion';

function emit(event: string, payload: Record<string, unknown>) {
  track(
    event as TrackedEventName,
    payload as unknown as TrackedEventMap[TrackedEventName],
  );
}

export function ConversionTracker() {
  const pathname = usePathname() ?? '';

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      try {
        handleConversionClick(event.target, window.location.pathname, { emit });
      } catch {
        // Measurement never interferes with navigation or copying.
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    const page = pageKind(pathname);
    if (page.kind !== 'rule') return;
    const tracker = createScrollDepthTracker((depth) =>
      emit('scroll_depth', {
        source_page: pathname,
        page_kind: page.kind,
        plugin: page.plugin,
        rule: page.rule,
        depth,
      }),
    );
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const doc = document.documentElement;
        tracker.update({
          scrollTop: window.scrollY,
          viewportHeight: window.innerHeight,
          scrollHeight: doc.scrollHeight,
        });
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}
