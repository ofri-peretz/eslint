'use client';

import * as React from 'react';

import { cn } from '../lib/cn.js';
import {
  StarsBackground,
  ShootingStars,
  Meteors,
} from '../aceternity/stars-background.js';
import { DaylightBackground } from '../aceternity/daylight-background.js';

export interface HeroCosmicCTA {
  label: React.ReactNode;
  href: string;
  /** Render any element as the button (e.g. `<Link>`, `<ShimmerButton>`). Falls back to a plain anchor. */
  render?: React.ReactElement<Record<string, unknown>>;
}

export interface HeroCosmicProps {
  /** Eyebrow content rendered above the headline (e.g. "🔒 Enterprise-Grade Security"). */
  eyebrow?: React.ReactNode;
  /** Main headline. Pass JSX (`<>foo<br/>bar</>`) for multi-line headlines with gradient spans. */
  headline: React.ReactNode;
  /** Sub-headline / tagline. */
  tagline?: React.ReactNode;
  /** Primary CTA. */
  primaryCta?: HeroCosmicCTA;
  /** Secondary CTA. */
  secondaryCta?: HeroCosmicCTA;
  /** Additional content rendered below CTAs (e.g. trust badges). */
  footer?: React.ReactNode;
  /** Class on the wrapping section. */
  className?: string;
  /** Tuning knobs for the cosmic effect. Sensible defaults match the reference site. */
  effects?: {
    starDensity?: number;
    twinkleProbability?: number;
    minTwinkleSpeed?: number;
    maxTwinkleSpeed?: number;
    shootingMinSpeed?: number;
    shootingMaxSpeed?: number;
    shootingMinDelay?: number;
    shootingMaxDelay?: number;
    shootingStarColor?: string;
    shootingTrailColor?: string;
    meteorCount?: number;
    meteorColor?: string;
    meteorMinDuration?: number;
    meteorMaxDuration?: number;
  };
  /** Tuning knobs for the daylight (light-theme) surface. */
  daylight?: {
    showSun?: boolean;
    showClouds?: boolean;
    cloudCount?: number;
  };
}

function renderCta(cta: HeroCosmicCTA | undefined) {
  if (!cta) return null;
  if (cta.render) {
    return React.cloneElement(cta.render, { href: cta.href }, cta.label);
  }
  return (
    <a
      href={cta.href}
      className="inline-flex items-center gap-2 rounded-xl border-2 border-white/20 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-sm transition-all hover:border-white/30 hover:bg-white/20"
    >
      {cta.label}
    </a>
  );
}

/**
 * Atmospheric landing-hero preset for fumadocs sites — theme-aware twin
 * surfaces. Light theme: Rayleigh-scattered sky + photorealistic sun +
 * fluffy clouds (Nuxt `DaylightBackground.vue` port). Dark theme:
 * starfield + shooting stars + meteors over a deep purple-to-black
 * gradient (Nuxt `CosmicBackground.vue` port).
 *
 * Both surfaces wrap the same content slot, so headline / tagline / CTAs
 * render exactly once — no duplicate `<h1>`, no SEO duplication, no
 * accessible-name doubling. The cosmetic name `HeroCosmic` is retained
 * for backwards-compatibility (this is a drop-in replacement).
 *
 * Cosmic defaults (star density, shooting-star delay/speed, meteor color
 * and duration) match the Nuxt blog reference one-for-one — drift here
 * was the reason "the new meteors feel weird" surfaced as a regression.
 */
export function HeroCosmic({
  eyebrow,
  headline,
  tagline,
  primaryCta,
  secondaryCta,
  footer,
  className,
  effects = {},
  daylight = {},
}: HeroCosmicProps) {
  // Cosmic-surface (dark theme) defaults — calibrated against the Nuxt
  // `CosmicBackground.vue` source so the visual cadence (how often a
  // shooting star streaks, how dense the starfield reads) stays put.
  const e = {
    starDensity: 0.00015,
    twinkleProbability: 0.7,
    minTwinkleSpeed: 0.5,
    maxTwinkleSpeed: 1,
    shootingMinSpeed: 10,
    shootingMaxSpeed: 30,
    shootingMinDelay: 1200,
    shootingMaxDelay: 4200,
    shootingStarColor: '#c084fc',
    shootingTrailColor: '#2EB9DF',
    meteorCount: 3,
    meteorColor: '#e9d5ff',
    meteorMinDuration: 12,
    meteorMaxDuration: 30,
    ...effects,
  };
  const d = {
    showSun: true,
    showClouds: true,
    cloudCount: 3,
    ...daylight,
  };

  return (
    <div
      data-slot="hero-cosmic"
      className={cn('relative', className)}
      style={{ contain: 'paint', clipPath: 'inset(0)' }}
    >
      <div className="relative flex min-h-screen items-center justify-center bg-linear-to-b from-sky-300 via-sky-100 to-amber-50 dark:bg-linear-to-b dark:from-purple-950 dark:via-slate-950 dark:to-black">
        {/* Light-theme atmospheric surface — sky + sun + clouds. */}
        <div
          data-slot="hero-daylight-layer"
          className="block dark:hidden absolute inset-0"
        >
          <DaylightBackground
            showSun={d.showSun}
            showClouds={d.showClouds}
            cloudCount={d.cloudCount}
          />
        </div>

        {/* Dark-theme cosmic surface — starfield + shooting stars + meteors. */}
        <div
          data-slot="hero-cosmic-layer"
          className="hidden dark:block absolute inset-0"
        >
          <StarsBackground
            starDensity={e.starDensity}
            allStarsTwinkle
            twinkleProbability={e.twinkleProbability}
            minTwinkleSpeed={e.minTwinkleSpeed}
            maxTwinkleSpeed={e.maxTwinkleSpeed}
          />
          <ShootingStars
            minSpeed={e.shootingMinSpeed}
            maxSpeed={e.shootingMaxSpeed}
            minDelay={e.shootingMinDelay}
            maxDelay={e.shootingMaxDelay}
            starColor={e.shootingStarColor}
            trailColor={e.shootingTrailColor}
            starWidth={10}
            starHeight={1}
          />
          <Meteors
            number={e.meteorCount}
            meteorColor={e.meteorColor}
            minDuration={e.meteorMinDuration}
            maxDuration={e.meteorMaxDuration}
          />
        </div>

        <div className="relative z-10 container mx-auto max-w-5xl px-4 py-20 text-center">
          {eyebrow ? <div className="mb-8 inline-flex">{eyebrow}</div> : null}

          <h1 className="mb-6 text-5xl font-extrabold tracking-tight md:text-6xl lg:text-7xl">
            {headline}
          </h1>

          {tagline ? (
            <p className="mx-auto mb-16 max-w-2xl text-lg leading-relaxed text-slate-700 drop-shadow dark:text-purple-100/90 md:text-xl">
              {tagline}
            </p>
          ) : null}

          {(primaryCta || secondaryCta) && (
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {renderCta(primaryCta)}
              {renderCta(secondaryCta)}
            </div>
          )}

          {footer ? <div className="mt-10">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
