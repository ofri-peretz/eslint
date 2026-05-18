/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
"use client";

/**
 * Meteors — Nuxt-faithful purple shower (with first-impression tuning).
 *
 * Port of `agents/apps/blog-old/app/components/CosmicBackground.vue`'s
 * meteor block. The Nuxt source had three quirks that read poorly on a
 * fresh page load (regardless of being byte-faithful):
 *
 *   1. Positive `animation-delay` (0–20s) meant the first ~1.4 seconds
 *      of the hero showed NO meteors at all — they were sitting at
 *      `top: -40px` waiting for their delay to elapse.
 *   2. Fixed `SPREAD_PX = 1600` clipped the leftmost meteor off-screen
 *      on every viewport narrower than 1600px — including all phones
 *      and most laptops. On mobile only 1 of 3 meteors ever appeared.
 *   3. The 0% keyframe set `opacity: 0.8`, so the meteor materialized
 *      at full strength rather than fading in. It never read as
 *      "entering the scene."
 *
 * This file restores the byte-faithful Nuxt geometry (3 meteors, purple
 * `#e9d5ff` trail, 120px ribbon, 12–30s duration, rotate(215deg) +
 * translateX(-500px) keyframe) but tunes the three initial-state quirks:
 *
 *   1. {@link buildMeteors} now uses NEGATIVE animation-delays seeded
 *      by `(idx * 13 + 7) % 100`. At t=0 each meteor is already mid-
 *      flight at a different phase, so the hero is never empty.
 *   2. {@link useEffectiveSpread} reads `window.innerWidth` and clamps
 *      the spread to `min(1600, width * 1.25)`. On desktop the wide
 *      Nuxt feel is preserved; on mobile the spread tightens so all
 *      three meteors are reachable.
 *   3. The keyframe now ramps opacity 0 → 0.8 over the first 15% and
 *      0.8 → 0 over the last 15%, so meteors visibly enter and exit.
 *
 * Color tokens still flow via `--color-meteor-trail` /
 * `--color-meteor-trail-fade` / `--color-meteor-glow` (defined in
 * `globals.css`) so Tier-B `ui-primitives-lock` keeps passing.
 */

import { useEffect, useState } from "react";

import { cn } from "#interlace/lib/utils";
import { useReducedMotion } from "#interlace/lib/use-reduced-motion";

interface MeteorsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of meteors to render. Default 3 — the Nuxt cadence. */
  number?: number;
  /** Stable selector for E2E tests; consumer provides — no default. */
  "data-testid"?: string;
}

interface MeteorMeta {
  /** Horizontal offset from viewport center, in pixels. */
  position: number;
  /**
   * Per-meteor delay in seconds (NEGATIVE — 0 to -DURATION_BASE_S, deterministic
   * per index). Negative `animation-delay` starts the animation already-in-
   * progress, so at t=0 each meteor is somewhere mid-flight rather than waiting
   * at top:-40px to begin.
   */
  delay: number;
  /** Per-meteor duration in seconds (12–30s, deterministic per index). */
  duration: number;
}

const ANGLE_DEG = 215;
const TRAVEL_PX = 500;
const TRAIL_PX = 120;
// Trail colors flow through tokens defined in `src/app/globals.css` —
// `--meteor-trail` / `--meteor-trail-fade` / `--meteor-glow`. The source
// hue is `#e9d5ff` (Nuxt blog-old) ≈ `oklch(0.89 0.07 308)`.
const TRAIL_COLOR = "var(--color-meteor-trail)";
const TRAIL_FADE_COLOR = "var(--color-meteor-trail-fade)";
const GLOW_COLOR = "var(--color-meteor-glow)";
const OPACITY = 0.8;
const DURATION_BASE_S = 12;
const DURATION_RANGE_S = 18;
const SPREAD_MAX_PX = 1600; // Nuxt original — preserved as the cap on wide viewports.
// Narrow viewports get `width * factor`. Set at 1.0 so the leftmost meteor
// spawns at the left edge and the rightmost at the right edge — both stay
// inside the viewport before the keyframe translation begins.
const SPREAD_VIEWPORT_FACTOR = 1.0;

const METEORS_CSS = `
  @keyframes blog-meteor-shower {
    0% {
      transform: rotate(${ANGLE_DEG}deg) translateX(0);
      opacity: 0;
    }
    15% {
      opacity: ${OPACITY};
    }
    85% {
      opacity: ${OPACITY};
    }
    100% {
      transform: rotate(${ANGLE_DEG}deg) translateX(-${TRAVEL_PX}px);
      opacity: 0;
    }
  }
  .blog-meteor {
    animation: blog-meteor-shower var(--meteor-duration, 20s) linear infinite;
    animation-delay: var(--meteor-delay, 0s);
  }
  @media (prefers-reduced-motion: reduce) {
    .blog-meteor {
      animation: none !important;
    }
  }
`;

function buildMeteors(count: number, spreadPx: number): MeteorMeta[] {
  return Array.from({ length: count }, (_, idx) => {
    const position = idx * (spreadPx / count) - spreadPx / 2;
    // Index-derived seed → same three meteors come back every mount.
    const seed = (idx * 13 + 7) % 100;
    // NEGATIVE delay: animation starts already-in-progress at t=0. Each
    // meteor lands somewhere in the first 0–DURATION_BASE_S seconds of
    // its cycle — staggered enough that they don't all enter at the same
    // moment, but never blank.
    const delay = -((seed / 100) * DURATION_BASE_S);
    const duration = DURATION_BASE_S + (seed / 100) * DURATION_RANGE_S;
    return { position, delay, duration };
  });
}

/**
 * Compute the meteor spread so it caps at Nuxt's 1600px on wide
 * viewports but tightens proportionally on narrower screens. Without
 * this, meteor 0 lands at `calc(50% - 800px)` which is off-screen-left
 * for any viewport < 1600px wide.
 */
function useEffectiveSpread(): number {
  const [spread, setSpread] = useState(SPREAD_MAX_PX);
  useEffect(() => {
    const apply = () => {
      setSpread(
        Math.min(SPREAD_MAX_PX, window.innerWidth * SPREAD_VIEWPORT_FACTOR),
      );
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
  return spread;
}

export function Meteors({
  number = 3,
  className,
  "data-testid": testId,
  ...rest
}: MeteorsProps) {
  const reduced = useReducedMotion();
  const spread = useEffectiveSpread();
  // Mount-only flag — the keyframe stylesheet is injected client-side to
  // avoid hydration churn from React's `dangerouslySetInnerHTML` in SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (reduced) return null;

  const meteors = buildMeteors(number, spread);

  return (
    <div
      data-slot="meteors"
      data-testid={testId}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      {...rest}
    >
      {mounted && <style dangerouslySetInnerHTML={{ __html: METEORS_CSS }} />}
      {mounted &&
        meteors.map((m, idx) => (
          <span
            key={idx}
            className="blog-meteor pointer-events-none absolute rounded-full"
            style={
              {
                top: "-40px",
                left: `calc(50% + ${m.position}px)`,
                width: `${TRAIL_PX}px`,
                height: "1px",
                background: `linear-gradient(90deg, ${TRAIL_COLOR} 0%, ${TRAIL_FADE_COLOR} 10%, transparent 100%)`,
                // Inline opacity is the steady-state target; the keyframe
                // overrides it (0 at edges, OPACITY in the middle) while
                // the animation is running.
                opacity: OPACITY,
                boxShadow: `0 0 2px 0px ${GLOW_COLOR}`,
                ["--meteor-delay" as string]: `${m.delay}s`,
                ["--meteor-duration" as string]: `${m.duration}s`,
              } as React.CSSProperties
            }
          />
        ))}
    </div>
  );
}
