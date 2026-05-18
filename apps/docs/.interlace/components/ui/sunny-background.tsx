/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
"use client";

/**
 * SunnyBackground — Nuxt-faithful daylight surface.
 *
 * Port of `agents/apps/blog-old/app/components/DaylightBackground.vue`.
 * The previous React version was a 2-layer gradient stack with one big
 * `60vmin` amber blur — perceptible only as a faint amber haze, which
 * is why the user reported *"the sunlight is not presenting"*.
 *
 * This version restores the full photorealistic sun from the Nuxt
 * source — every layer the original tuned, byte-for-byte:
 *
 *  - Sky base — five-stop linear-gradient approximating Rayleigh
 *    scattering (zenith blue → horizon amber)
 *  - Upper atmosphere — deeper zenith blue overlay
 *  - Atmospheric haze — morning-mist amber over blue
 *  - Outer corona — 320px radial, blur(20px), very subtle wide spread
 *  - Middle corona — 180px radial, blur(10px), warmer
 *  - Inner glow — 100px radial with dual box-shadow halos
 *  - Overexposed core — 44px disc with triple box-shadow bloom
 *  - Rotating rays — 200px conic-gradient, 120s linear infinite,
 *    blur(2px) (prefers-reduced-motion safe)
 *  - 4 lens flares — h / v / diag-1 / diag-2 anamorphic streaks
 *  - 2 secondary flare spots — small radial ghosts off-axis
 *  - Horizon warm glow — bottom golden-hour band
 *  - Vignette — subtle radial depth cue
 *
 * In dark mode the surface is intentionally dimmed (the `opacity-70`
 * applied by `HeroBackdrop` already softens it), so the heavy CSS
 * detail reads correctly in light mode without overpowering the
 * cosmic dark theme.
 *
 * Reduced motion: only the rays rotation is killed — the static layers
 * keep rendering (no point hiding them, only the animation needs to
 * stop). The whole component is also a no-op when `HeroBackdrop`
 * short-circuits on the same media query upstream.
 */

import { cn } from "#interlace/lib/utils";

interface SunnyBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stable selector for E2E tests; consumer provides — no default. */
  "data-testid"?: string;
}

const SUNNY_CSS = `
  .blog-sky-base {
    background: linear-gradient(
      180deg,
      hsl(210, 80%, 55%) 0%,
      hsl(205, 75%, 65%) 20%,
      hsl(200, 70%, 75%) 40%,
      hsl(195, 60%, 82%) 60%,
      hsl(45, 50%, 88%) 85%,
      hsl(40, 60%, 90%) 100%
    );
  }
  .blog-sky-upper {
    background: linear-gradient(
      180deg,
      rgba(59, 130, 246, 0.2) 0%,
      transparent 50%,
      transparent 100%
    );
  }
  .blog-sky-haze {
    background: linear-gradient(
      0deg,
      rgba(255, 251, 235, 0.4) 0%,
      rgba(219, 234, 254, 0.2) 50%,
      transparent 100%
    );
  }
  .blog-sky-horizon {
    background: linear-gradient(
      to top,
      rgba(255, 245, 230, 0.5) 0%,
      rgba(255, 235, 210, 0.3) 20%,
      rgba(200, 220, 245, 0.15) 50%,
      transparent 100%
    );
    pointer-events: none;
  }
  .blog-sky-vignette {
    background: radial-gradient(
      ellipse at center,
      transparent 50%,
      rgba(100, 140, 180, 0.05) 100%
    );
    pointer-events: none;
  }
  .blog-sun-container {
    width: 20rem;
    height: 20rem;
  }
  .blog-sun-corona,
  .blog-sun-glow,
  .blog-sun-core,
  .blog-sun-rays {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
  }
  .blog-sun-corona-outer {
    width: 320px;
    height: 320px;
    background: radial-gradient(
      circle,
      rgba(255, 248, 220, 0.15) 0%,
      rgba(255, 220, 150, 0.08) 30%,
      rgba(255, 200, 100, 0.03) 60%,
      transparent 100%
    );
    filter: blur(20px);
  }
  .blog-sun-corona-middle {
    width: 180px;
    height: 180px;
    background: radial-gradient(
      circle,
      rgba(255, 250, 230, 0.5) 0%,
      rgba(255, 230, 180, 0.3) 40%,
      rgba(255, 200, 120, 0.1) 70%,
      transparent 100%
    );
    filter: blur(10px);
  }
  .blog-sun-glow {
    width: 100px;
    height: 100px;
    background: radial-gradient(
      circle,
      rgba(255, 255, 250, 0.95) 0%,
      rgba(255, 245, 220, 0.7) 40%,
      rgba(255, 230, 180, 0.3) 70%,
      transparent 100%
    );
    box-shadow:
      0 0 40px 15px rgba(255, 245, 200, 0.4),
      0 0 80px 40px rgba(255, 220, 150, 0.2);
  }
  .blog-sun-core {
    width: 44px;
    height: 44px;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 1) 0%,
      rgba(255, 255, 250, 1) 50%,
      rgba(255, 250, 230, 0.95) 80%,
      rgba(255, 240, 200, 0.8) 100%
    );
    box-shadow:
      0 0 20px 8px rgba(255, 255, 255, 0.9),
      0 0 40px 15px rgba(255, 250, 220, 0.6),
      0 0 60px 25px rgba(255, 240, 180, 0.3);
  }
  .blog-sun-rays {
    width: 200px;
    height: 200px;
    background: conic-gradient(
      from 0deg,
      transparent 0deg,
      rgba(255, 250, 220, 0.04) 5deg,
      transparent 10deg,
      transparent 20deg,
      rgba(255, 250, 220, 0.03) 25deg,
      transparent 30deg,
      transparent 45deg,
      rgba(255, 250, 220, 0.05) 50deg,
      transparent 55deg,
      transparent 70deg,
      rgba(255, 250, 220, 0.03) 75deg,
      transparent 80deg,
      transparent 90deg,
      rgba(255, 250, 220, 0.04) 95deg,
      transparent 100deg,
      transparent 110deg,
      rgba(255, 250, 220, 0.03) 115deg,
      transparent 120deg,
      transparent 135deg,
      rgba(255, 250, 220, 0.05) 140deg,
      transparent 145deg,
      transparent 160deg,
      rgba(255, 250, 220, 0.03) 165deg,
      transparent 170deg,
      transparent 180deg,
      rgba(255, 250, 220, 0.04) 185deg,
      transparent 190deg,
      transparent 200deg,
      rgba(255, 250, 220, 0.03) 205deg,
      transparent 210deg,
      transparent 225deg,
      rgba(255, 250, 220, 0.05) 230deg,
      transparent 235deg,
      transparent 250deg,
      rgba(255, 250, 220, 0.03) 255deg,
      transparent 260deg,
      transparent 270deg,
      rgba(255, 250, 220, 0.04) 275deg,
      transparent 280deg,
      transparent 290deg,
      rgba(255, 250, 220, 0.03) 295deg,
      transparent 300deg,
      transparent 315deg,
      rgba(255, 250, 220, 0.05) 320deg,
      transparent 325deg,
      transparent 340deg,
      rgba(255, 250, 220, 0.03) 345deg,
      transparent 350deg,
      transparent 360deg
    );
    animation: blog-sun-rays-rotate 120s linear infinite;
    filter: blur(2px);
  }
  .blog-lens-flare {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.6) 45%,
      rgba(255, 255, 255, 0.8) 50%,
      rgba(255, 255, 255, 0.6) 55%,
      transparent 100%
    );
    filter: blur(0.5px);
  }
  .blog-lens-flare-h {
    width: 120px;
    height: 2px;
    opacity: 0.4;
  }
  .blog-lens-flare-v {
    width: 2px;
    height: 80px;
    background: linear-gradient(
      180deg,
      transparent 0%,
      rgba(255, 255, 255, 0.5) 45%,
      rgba(255, 255, 255, 0.7) 50%,
      rgba(255, 255, 255, 0.5) 55%,
      transparent 100%
    );
    opacity: 0.3;
  }
  .blog-lens-flare-diag-1 {
    width: 60px;
    height: 1px;
    transform: translate(-50%, -50%) rotate(45deg);
    opacity: 0.2;
  }
  .blog-lens-flare-diag-2 {
    width: 60px;
    height: 1px;
    transform: translate(-50%, -50%) rotate(-45deg);
    opacity: 0.2;
  }
  .blog-flare-spot {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(255, 220, 180, 0.3) 0%,
      rgba(255, 200, 150, 0.1) 50%,
      transparent 100%
    );
  }
  .blog-flare-spot-1 {
    left: calc(50% + 80px);
    top: calc(50% + 60px);
    width: 20px;
    height: 20px;
    opacity: 0.5;
  }
  .blog-flare-spot-2 {
    left: calc(50% + 120px);
    top: calc(50% + 90px);
    width: 12px;
    height: 12px;
    opacity: 0.3;
  }
  @keyframes blog-sun-rays-rotate {
    from {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    to {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .blog-sun-rays {
      animation: none !important;
    }
  }
`;

export function SunnyBackground({
  className,
  "data-testid": testId,
  ...rest
}: SunnyBackgroundProps) {
  return (
    <div
      data-slot="sunny-background"
      data-testid={testId}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      {...rest}
    >
      <style dangerouslySetInnerHTML={{ __html: SUNNY_CSS }} />

      {/* Layered atmospheric sky. */}
      <div className="blog-sky-base absolute inset-0" />
      <div className="blog-sky-upper absolute inset-0" />
      <div className="blog-sky-haze absolute inset-0" />

      {/* Sun anchored top-right (responsive nudge inward on small viewports
          so the 20rem container doesn't crowd the eyebrow text). */}
      <div className="blog-sun-container absolute top-8 right-16 sm:top-12 sm:right-24">
        <div className="blog-sun-corona blog-sun-corona-outer" />
        <div className="blog-sun-corona blog-sun-corona-middle" />
        <div className="blog-sun-glow" />
        <div className="blog-sun-core" />
        <div className="blog-sun-rays" />
        <div className="blog-lens-flare blog-lens-flare-h" />
        <div className="blog-lens-flare blog-lens-flare-v" />
        <div className="blog-lens-flare blog-lens-flare-diag-1" />
        <div className="blog-lens-flare blog-lens-flare-diag-2" />
        <div className="blog-flare-spot blog-flare-spot-1" />
        <div className="blog-flare-spot blog-flare-spot-2" />
      </div>

      {/* Bottom horizon golden-hour band + vignette depth cue. */}
      <div className="blog-sky-horizon absolute bottom-0 left-0 right-0 h-1/2" />
      <div className="blog-sky-vignette absolute inset-0" />
    </div>
  );
}
