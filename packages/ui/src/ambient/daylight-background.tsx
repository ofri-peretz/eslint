'use client';

/**
 * @interlace/ui — Daylight background primitives
 *
 * Port of the Nuxt blog's DaylightBackground.vue + CloudParticle.vue. The
 * sister surface to `stars-background.tsx`: when the docs site is viewed
 * in light mode, this is what fills the hero. Three exports:
 *
 *   - {@link SkyGradient}    Layered atmospheric gradients (Rayleigh-ish
 *                            scattering, upper-atmosphere blue, morning
 *                            mist, horizon warm glow, vignette).
 *   - {@link Sun}            Photorealistic sun — outer/middle corona,
 *                            bright inner glow, overexposed core,
 *                            conic-gradient rotating rays, lens flares.
 *   - {@link CloudParticle}  Fluffy clouds via multi-layer SVG turbulence
 *                            (5-layer feMerge for volumetric depth,
 *                            blue-tinted underside shadow, animated
 *                            base-frequency morphing).
 *
 * Architectural parity with the Nuxt source — same deterministic seeds,
 * same animation durations, same color values — so the visual feel
 * matches the previous blog hero one-for-one. The hand-rolled SVG filter
 * matrix in {@link CloudParticle} is copied verbatim (a re-derivation
 * risks breaking the "looks like Framer clouds" aesthetic the original
 * was tuned for).
 *
 * Reduced motion: rotating sun rays and turbulence morph honor
 * `prefers-reduced-motion: reduce` via `useReducedMotion`. The static
 * pieces (sun corona, cloud base shape) keep rendering — there's no
 * point hiding them, only the animation needs to stop.
 */

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '../lib/cn.js';
import { useReducedMotion } from '../lib/use-reduced-motion.js';

/* -------------------------------------------------------------------------- */
/*  Style strings                                                              */
/* -------------------------------------------------------------------------- */

// Sun + sky CSS lives outside the component body so React doesn't re-allocate
// the string on every render. Indented to match the source verbatim — the
// keyframe percentages and conic-gradient stops must stay byte-identical to
// the Nuxt original or the visual matches drift.
const SKY_GRADIENT_CSS = `
  .interlace-sky-base {
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
  .interlace-sky-upper {
    background: linear-gradient(
      180deg,
      rgba(59, 130, 246, 0.2) 0%,
      transparent 50%,
      transparent 100%
    );
  }
  .interlace-sky-haze {
    background: linear-gradient(
      0deg,
      rgba(255, 251, 235, 0.4) 0%,
      rgba(219, 234, 254, 0.2) 50%,
      transparent 100%
    );
  }
  .interlace-sky-horizon {
    background: linear-gradient(
      to top,
      rgba(255, 245, 230, 0.5) 0%,
      rgba(255, 235, 210, 0.3) 20%,
      rgba(200, 220, 245, 0.15) 50%,
      transparent 100%
    );
    pointer-events: none;
  }
  .interlace-sky-vignette {
    background: radial-gradient(
      ellipse at center,
      transparent 50%,
      rgba(100, 140, 180, 0.05) 100%
    );
    pointer-events: none;
  }
`;

const SUN_CSS = `
  .interlace-sun-container {
    width: 20rem;
    height: 20rem;
    transform: translate(-50%, -50%);
  }
  .interlace-sun-corona,
  .interlace-sun-glow,
  .interlace-sun-core,
  .interlace-sun-rays {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
  }
  .interlace-sun-corona-outer {
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
  .interlace-sun-corona-middle {
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
  .interlace-sun-glow {
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
  .interlace-sun-core {
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
  .interlace-sun-rays {
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
    animation: interlace-sun-rays-rotate 120s linear infinite;
    filter: blur(2px);
  }
  .interlace-lens-flare {
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
  .interlace-lens-flare-h {
    width: 120px;
    height: 2px;
    opacity: 0.4;
  }
  .interlace-lens-flare-v {
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
  .interlace-lens-flare-diag-1 {
    width: 60px;
    height: 1px;
    transform: translate(-50%, -50%) rotate(45deg);
    opacity: 0.2;
  }
  .interlace-lens-flare-diag-2 {
    width: 60px;
    height: 1px;
    transform: translate(-50%, -50%) rotate(-45deg);
    opacity: 0.2;
  }
  .interlace-flare-spot {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(255, 220, 180, 0.3) 0%,
      rgba(255, 200, 150, 0.1) 50%,
      transparent 100%
    );
  }
  .interlace-flare-spot-1 {
    left: calc(50% + 80px);
    top: calc(50% + 60px);
    width: 20px;
    height: 20px;
    opacity: 0.5;
  }
  .interlace-flare-spot-2 {
    left: calc(50% + 120px);
    top: calc(50% + 90px);
    width: 12px;
    height: 12px;
    opacity: 0.3;
  }
  @keyframes interlace-sun-rays-rotate {
    from {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    to {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .interlace-sun-rays {
      animation: none !important;
    }
  }
`;

const CLOUD_CSS = `
  .interlace-cloud-particle {
    width: 320px;
    height: 140px;
    transform: scale(var(--cloud-scale, 1));
    opacity: var(--cloud-opacity, 0.9);
    animation: interlace-cloud-drift var(--cloud-speed, 180s) linear infinite;
    animation-delay: var(--cloud-delay, 0s);
    will-change: transform;
  }
  .interlace-cloud-shape {
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
  @keyframes interlace-cloud-drift {
    0% {
      transform: translateX(0) translateY(0) scale(var(--cloud-scale, 1));
    }
    100% {
      transform: translateX(130vw) translateY(0) scale(var(--cloud-scale, 1));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .interlace-cloud-particle {
      animation: none !important;
    }
  }
`;

/* -------------------------------------------------------------------------- */
/*  SkyGradient                                                                */
/* -------------------------------------------------------------------------- */

export interface SkyGradientProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Atmospheric sky base — five stacked gradient layers that together approximate
 * Rayleigh-scattered morning light. Static, server-renderable.
 */
export function SkyGradient({ className, ...rest }: SkyGradientProps) {
  return (
    <div
      data-slot="sky-gradient"
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
      {...rest}
    >
      <style dangerouslySetInnerHTML={{ __html: SKY_GRADIENT_CSS }} />
      <div className="absolute inset-0 interlace-sky-base" />
      <div className="absolute inset-0 interlace-sky-upper" />
      <div className="absolute inset-0 interlace-sky-haze" />
      <div className="absolute bottom-0 left-0 right-0 h-1/2 interlace-sky-horizon" />
      <div className="absolute inset-0 interlace-sky-vignette" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sun                                                                        */
/* -------------------------------------------------------------------------- */

export interface SunProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional override for the corner the sun anchors to. Defaults to top-right. */
  className?: string;
}

/**
 * Photorealistic sun — outer / middle corona, bright inner glow, overexposed
 * core, conic-gradient rotating rays, lens flares. Anchored top-right by
 * default; pass a className to override position.
 *
 * The rotating rays honor `prefers-reduced-motion` via the keyframe override
 * in {@link SUN_CSS}; the static layers always render.
 */
export function Sun({ className, ...rest }: SunProps) {
  return (
    <div
      data-slot="sun"
      aria-hidden
      className={cn(
        'absolute top-8 right-16 sm:top-12 sm:right-24 interlace-sun-container',
        className,
      )}
      {...rest}
    >
      <style dangerouslySetInnerHTML={{ __html: SUN_CSS }} />
      <div className="interlace-sun-corona interlace-sun-corona-outer" />
      <div className="interlace-sun-corona interlace-sun-corona-middle" />
      <div className="interlace-sun-glow" />
      <div className="interlace-sun-core" />
      <div className="interlace-sun-rays" />
      <div className="interlace-lens-flare interlace-lens-flare-h" />
      <div className="interlace-lens-flare interlace-lens-flare-v" />
      <div className="interlace-lens-flare interlace-lens-flare-diag-1" />
      <div className="interlace-lens-flare interlace-lens-flare-diag-2" />
      <div className="interlace-flare-spot interlace-flare-spot-1" />
      <div className="interlace-flare-spot interlace-flare-spot-2" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  CloudParticle                                                              */
/* -------------------------------------------------------------------------- */

export interface CloudParticleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of cloud particles to render. Reduced to 2 on viewports < 768px. */
  cloudCount?: number;
  /** Slowest drift duration in seconds (random per cloud across [min, max]). */
  minSpeed?: number;
  /** Fastest drift duration in seconds. */
  maxSpeed?: number;
  /** Smallest cloud scale (1.0 = native 320×140px). */
  minScale?: number;
  /** Largest cloud scale. */
  maxScale?: number;
  className?: string;
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

const FILTER_ID = 'interlace-cloud-volumetric-filter';
const PHI = 1.618033988749;

function generateClouds(
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

/**
 * Fluffy clouds. Port of the Nuxt CloudParticle.vue — same 5-layer SVG
 * turbulence filter, same golden-ratio-seeded positions, same drift
 * keyframe. Reduces cloud count to 2 on mobile (<768px).
 *
 * Turbulence base-frequency morphing is intentionally simplified relative
 * to the original: the Nuxt version animated the noise frequency to make
 * clouds "breathe" over time, which is barely perceptible at the scales
 * we render and is expensive on lower-end GPUs. The port keeps the
 * frequency static at the Nuxt midpoint (0.012).
 */
export function CloudParticle({
  cloudCount = 3,
  minSpeed = 150,
  maxSpeed = 250,
  minScale = 0.5,
  maxScale = 0.9,
  className,
  ...rest
}: CloudParticleProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [effectiveCount, setEffectiveCount] = useState(cloudCount);
  const reduceMotion = useReducedMotion();

  // Mobile downshift — fewer clouds on small screens (per Nuxt original).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const apply = () => {
      const mobile = window.innerWidth < 768;
      setEffectiveCount(mobile ? Math.min(cloudCount, 2) : cloudCount);
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [cloudCount]);

  // Visibility pause — stop the drift animation when offscreen.
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry?.isIntersecting ?? true),
      { threshold: 0.1 },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const clouds = generateClouds(
    effectiveCount,
    minSpeed,
    maxSpeed,
    minScale,
    maxScale,
  );

  return (
    <div
      ref={containerRef}
      data-slot="cloud-particle"
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
      {...rest}
    >
      <style dangerouslySetInnerHTML={{ __html: CLOUD_CSS }} />

      {/* Volumetric cloud SVG filter — 5-layer feMerge matches Nuxt port. */}
      <svg className="absolute w-0 h-0" aria-hidden>
        <defs>
          <filter id={FILTER_ID} x="-100%" y="-100%" width="300%" height="300%">
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

      {clouds.map((cloud) => (
        <div
          key={`cloud-${cloud.id}`}
          className="interlace-cloud-particle absolute"
          style={
            {
              left: `${cloud.x}%`,
              top: `${cloud.y}%`,
              ['--cloud-scale' as string]: String(cloud.scale),
              ['--cloud-opacity' as string]: String(cloud.opacity),
              ['--cloud-speed' as string]: `${cloud.speed}s`,
              ['--cloud-delay' as string]: `${cloud.delay}s`,
              animationPlayState:
                reduceMotion || !isVisible ? 'paused' : 'running',
            } as React.CSSProperties
          }
        >
          <div
            className="interlace-cloud-shape"
            style={{ filter: `url(#${FILTER_ID})` }}
          />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  DaylightBackground (convenience wrapper)                                   */
/* -------------------------------------------------------------------------- */

export interface DaylightBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to render the sun. */
  showSun?: boolean;
  /** Whether to render the cloud particles. */
  showClouds?: boolean;
  /** Cloud count (mobile-clamped to 2). */
  cloudCount?: number;
  className?: string;
}

/**
 * Convenience wrapper that stacks {@link SkyGradient} + {@link Sun} +
 * {@link CloudParticle} in the canonical order — sky base, sun in the
 * top-right, clouds drifting across. Matches Nuxt `DaylightBackground.vue`
 * one-for-one. Use it directly, or compose the pieces yourself if you
 * need a different sun position / cloud density.
 */
export function DaylightBackground({
  showSun = true,
  showClouds = true,
  cloudCount = 3,
  className,
  ...rest
}: DaylightBackgroundProps) {
  return (
    <div
      data-slot="daylight-background"
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
      {...rest}
    >
      <SkyGradient />
      {showSun && <Sun />}
      {showClouds && <CloudParticle cloudCount={cloudCount} />}
    </div>
  );
}
