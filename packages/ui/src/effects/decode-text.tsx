'use client';

import * as React from 'react';
import { cn } from '../lib/cn.js';

/**
 * DecodeText — micro-labels resolve from glyph noise into their text.
 *
 * ## RFC (R3)
 *
 * The label-scale member of the Interlace signature kit (border →
 * InterlaceWeave, data → TimelineMap). A terminal-decode on monospace
 * micro-labels is native to a lint/security brand — the aesthetic of
 * tooling output, not borrowed flair. Travel signal (R2): HIGH — card
 * category chips, cover hooks, section eyebrows, stat labels.
 *
 * ## Honesty contract
 *
 * Static markup ALWAYS carries the final text — crawlers, reader mode,
 * and JS-off visitors never see noise (the same SSR-honesty rule as
 * NumberTicker). The decode runs client-side only, once, when triggered;
 * `prefers-reduced-motion` skips it entirely.
 *
 * ## API parity (R17)
 *
 * `trigger` is an enum (R8: more than two plausible values) mirroring
 * common in-view/interaction reveal APIs: `"visible"`
 * (IntersectionObserver, once — the grid-entrance feel) or `"hover"`
 * (self pointer-enter, re-armable). Duration is capped short (600ms) —
 * a label, not a scene.
 */
export interface DecodeTextProps
  extends Omit<React.ComponentPropsWithoutRef<'span'>, 'children'> {
  /** Stable selector for E2E tests; consumer provides — no default (R5). */
  'data-testid': string;
  /** The final text. Plain string only — the decode is per-character. */
  children: string;
  /**
   * What starts the decode.
   * @default "visible"
   */
  trigger?: 'visible' | 'hover';
}

const GLYPHS = '!<>-_\\/[]{}=+*^?#01';
const DURATION_MS = 600;

export function DecodeText({
  'data-testid': testId,
  children,
  trigger = 'visible',
  className,
  ...rest
}: DecodeTextProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const playing = React.useRef(false);

  const play = React.useCallback(() => {
    const el = ref.current;
    if (!el || playing.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    playing.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / DURATION_MS, 1);
      const resolved = Math.floor(t * children.length);
      let out = children.slice(0, resolved);
      for (let i = resolved; i < children.length; i++) {
        out +=
          children[i] === ' '
            ? ' '
            : GLYPHS[(i * 7 + Math.floor(now / 50)) % GLYPHS.length];
      }
      el.textContent = out;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = children;
        if (trigger === 'hover') playing.current = false;
      }
    };
    requestAnimationFrame(step);
  }, [children, trigger]);

  React.useEffect(() => {
    if (trigger !== 'visible' || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          play();
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [trigger, play]);

  return (
    <span
      ref={ref}
      data-slot="decode-text"
      data-testid={testId}
      onMouseEnter={trigger === 'hover' ? play : undefined}
      className={cn('inline-block', className)}
      {...rest}
    >
      {/* Always the FINAL text: what crawlers and JS-off visitors keep.
          The decode rewrites textContent client-side only. */}
      {children}
    </span>
  );
}
