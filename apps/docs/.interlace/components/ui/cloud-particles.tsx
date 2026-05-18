/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
"use client";

/**
 * CloudParticles — Nuxt-faithful fluffy clouds.
 *
 * Port of `agents/apps/blog-old/app/components/CloudParticle.vue`. The
 * previous React version used the `Particles` mouse-reactive primitive
 * with `density={30}` — 30 tiny white dots drifting — which is why the
 * user reported *"the clouds are not presenting"*. Those weren't clouds
 * at all; they were stars-with-mouse-physics misapplied to a cloud slot.
 *
 * This version is a faithful port of the Vue source — same multi-layer
 * SVG `feMerge` volumetric filter, same dual `feTurbulence` sources
 * (detail + broad shapes), same blue-tinted underside shadow
 * (`rgb(66, 105, 146)`), same deterministic golden-ratio cloud
 * positioning, same drift keyframe (`translateX(130vw)` over 150–250s).
 *
 * Key implementation notes carried over from the Vue source:
 *
 *  - 5-layer feMerge stack (back-to-front): deep shadow, soft gray
 *    shadow, blue-tinted underside, main white body. Each layer offset
 *    and displaced through one of two fractal-noise sources so the
 *    fluff shape varies between layers.
 *  - `feDisplacementMap` scale 70–90 — high enough that cloud edges
 *    read as fluffy rather than as a blurred ellipse.
 *  - The `turbulence morphing` animation from the Vue source is
 *    intentionally dropped: the Vue comment notes it's "barely
 *    noticeable" and it's expensive on lower-end GPUs. Base frequency
 *    is fixed at the Vue midpoint (0.012). The drift keyframe is
 *    unchanged.
 *
 *  - Density prop maps 1:1 to `cloudCount` for backwards compat with
 *    the `hero-backdrop.tsx` call site. Mobile (<768px) clamps to 2
 *    clouds for GPU budget, matching the Vue behavior.
 *
 *  - Filter ID stays static (`blog-cloud-filter`) — no per-mount UUID,
 *    no hydration mismatch. The filter is defined inside the same
 *    component so consumers don't need a separate `<defs>` host.
 */

import { useEffect, useState } from "react";

import { cn } from "#interlace/lib/utils";
import { useReducedMotion } from "#interlace/lib/use-reduced-motion";

interface CloudParticlesProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of cloud particles. Mobile (<768px) clamps to 2. Default 3. */
  density?: number;
  /** Slowest drift duration in seconds (random per cloud across [min, max]). */
  minSpeed?: number;
  /** Fastest drift duration in seconds. */
  maxSpeed?: number;
  /** Smallest cloud scale (1.0 = native 320×140px). */
  minScale?: number;
  /** Largest cloud scale. */
  maxScale?: number;
  /** Stable selector for E2E tests; consumer provides — no default. */
  "data-testid"?: string;
}

interface CloudMeta {
  id: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  speed: number;
  delay: number;
}

const FILTER_ID = "blog-cloud-filter";
const PHI = 1.618033988749;
const MOBILE_BREAKPOINT = 768;
const MOBILE_CLOUD_CAP = 2;

const CLOUDS_CSS = `
  .blog-cloud-particle {
    width: 320px;
    height: 140px;
    transform: scale(var(--cloud-scale, 1));
    opacity: var(--cloud-opacity, 0.9);
    animation: blog-cloud-drift var(--cloud-speed, 180s) linear infinite;
    animation-delay: var(--cloud-delay, 0s);
    will-change: transform;
  }
  .blog-cloud-shape {
    width: 100%;
    height: 100%;
    background: radial-gradient(
      ellipse 55% 45% at 50% 45%,
      rgba(255, 255, 255, 1) 0%,
      rgba(255, 255, 255, 0.95) 30%,
      rgba(255, 255, 255, 0.8) 60%,
      rgba(255, 255, 255, 0.4) 80%,
      transparent 100%
    );
    border-radius: 50%;
  }
  @keyframes blog-cloud-drift {
    0% {
      transform: translateX(0) translateY(0) scale(var(--cloud-scale, 1));
    }
    100% {
      transform: translateX(130vw) translateY(0) scale(var(--cloud-scale, 1));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .blog-cloud-particle {
      animation: none !important;
    }
  }
`;

function buildClouds(
  count: number,
  minSpeed: number,
  maxSpeed: number,
  minScale: number,
  maxScale: number,
): CloudMeta[] {
  return Array.from({ length: count }, (_, idx) => {
    const seed = (idx * PHI) % 1;
    const seed2 = ((idx + 1) * PHI * 0.7) % 1;
    const seed3 = ((idx + 2) * PHI * 0.5) % 1;
    return {
      id: idx,
      x: -15 + seed * 30,
      y: 6 + seed2 * 16,
      scale: minScale + seed3 * (maxScale - minScale),
      opacity: 0.85 + seed * 0.15,
      speed: minSpeed + seed2 * (maxSpeed - minSpeed),
      delay: idx * 25,
    };
  });
}

export function CloudParticles({
  density = 3,
  minSpeed = 150,
  maxSpeed = 250,
  minScale = 0.5,
  maxScale = 0.9,
  className,
  "data-testid": testId,
  ...rest
}: CloudParticlesProps) {
  const reduced = useReducedMotion();
  const [effectiveCount, setEffectiveCount] = useState(density);
  // Mount-only flag — keyframe stylesheet is injected client-side to
  // avoid React hydration churn on dangerouslySetInnerHTML.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const apply = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setEffectiveCount(mobile ? Math.min(density, MOBILE_CLOUD_CAP) : density);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [density]);

  if (reduced) return null;

  const clouds = buildClouds(
    effectiveCount,
    minSpeed,
    maxSpeed,
    minScale,
    maxScale,
  );

  return (
    <div
      data-slot="cloud-particles"
      data-testid={testId}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      {...rest}
    >
      {mounted && <style dangerouslySetInnerHTML={{ __html: CLOUDS_CSS }} />}

      {/* Volumetric cloud SVG filter — 5-layer feMerge from the Vue source. */}
      <svg className="absolute h-0 w-0" aria-hidden>
        <defs>
          <filter id={FILTER_ID} x="-100%" y="-100%" width="300%" height="300%">
            {/* Two fractal-noise sources — fine detail + broader fluff shapes. */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012"
              numOctaves={5}
              seed={15}
              result="noise1"
            />
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.0096"
              numOctaves={2}
              seed={42}
              result="noise2"
            />

            {/* Layer 1 — main white cloud body. */}
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation={18}
              result="blur1"
            />
            <feDisplacementMap
              in="blur1"
              in2="noise1"
              scale={90}
              xChannelSelector="R"
              yChannelSelector="G"
              result="layer1"
            />

            {/* Layer 2 — blue-tinted underside (lit-from-above cue). */}
            <feFlood
              floodColor="rgb(66, 105, 146)"
              floodOpacity={0.08}
              result="blueColor"
            />
            <feOffset in="SourceGraphic" dx={-8} dy={35} result="offset2" />
            <feGaussianBlur in="offset2" stdDeviation={18} result="blur2" />
            <feDisplacementMap
              in="blur2"
              in2="noise1"
              scale={85}
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced2"
            />
            <feComposite
              in="blueColor"
              in2="displaced2"
              operator="in"
              result="layer2"
            />

            {/* Layer 3 — soft gray shadow. */}
            <feFlood
              floodColor="rgb(120, 140, 160)"
              floodOpacity={0.12}
              result="shadowColor1"
            />
            <feOffset in="SourceGraphic" dx={15} dy={50} result="offset3" />
            <feGaussianBlur in="offset3" stdDeviation={25} result="blur3" />
            <feDisplacementMap
              in="blur3"
              in2="noise2"
              scale={70}
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced3"
            />
            <feComposite
              in="shadowColor1"
              in2="displaced3"
              operator="in"
              result="layer3"
            />

            {/* Layer 4 — deep shadow for depth. */}
            <feFlood
              floodColor="rgb(80, 100, 120)"
              floodOpacity={0.08}
              result="shadowColor2"
            />
            <feOffset in="SourceGraphic" dx={18} dy={60} result="offset4" />
            <feGaussianBlur in="offset4" stdDeviation={28} result="blur4" />
            <feDisplacementMap
              in="blur4"
              in2="noise2"
              scale={80}
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced4"
            />
            <feComposite
              in="shadowColor2"
              in2="displaced4"
              operator="in"
              result="layer4"
            />

            <feMerge>
              <feMergeNode in="layer4" />
              <feMergeNode in="layer3" />
              <feMergeNode in="layer2" />
              <feMergeNode in="layer1" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {mounted &&
        clouds.map((cloud) => (
          <div
            key={`cloud-${cloud.id}`}
            className="blog-cloud-particle absolute"
            style={
              {
                left: `${cloud.x}%`,
                top: `${cloud.y}%`,
                ["--cloud-scale" as string]: String(cloud.scale),
                ["--cloud-opacity" as string]: String(cloud.opacity),
                ["--cloud-speed" as string]: `${cloud.speed}s`,
                ["--cloud-delay" as string]: `${cloud.delay}s`,
              } as React.CSSProperties
            }
          >
            <div
              className="blog-cloud-shape"
              style={{ filter: `url(#${FILTER_ID})` }}
            />
          </div>
        ))}
    </div>
  );
}
