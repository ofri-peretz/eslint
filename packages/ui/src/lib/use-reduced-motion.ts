'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `true` when the user has `prefers-reduced-motion: reduce` set.
 *
 * Industry-canon hook (MUI, Vercel, Linear, Stripe all ship equivalents).
 * Server-render-safe — defaults to `false` on the server, then updates on
 * mount once `window.matchMedia` is available.
 *
 * Use to gate motion-heavy components: animations should be disabled or
 * dramatically reduced when this returns `true`.
 *
 * @example
 * ```tsx
 * const reduceMotion = useReducedMotion();
 * <div className={reduceMotion ? 'static' : 'animate-bounce'} />
 * ```
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
