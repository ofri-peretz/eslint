'use client';

import * as React from 'react';

import { cn } from '../lib/cn.js';
import {
  StarsBackground,
  ShootingStars,
  Meteors,
} from '../aceternity/stars-background.js';

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
 * Cosmic landing-hero preset for fumadocs sites: starfield + shooting stars
 * + meteors over a deep purple-to-black gradient. Drop-in replacement for a
 * hand-rolled hero — pass headline / tagline / CTAs and you're done.
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
}: HeroCosmicProps) {
  const e = {
    starDensity: 0.0002,
    twinkleProbability: 0.8,
    minTwinkleSpeed: 0.4,
    maxTwinkleSpeed: 1.2,
    shootingMinSpeed: 10,
    shootingMaxSpeed: 35,
    shootingMinDelay: 600,
    shootingMaxDelay: 2500,
    shootingStarColor: '#c084fc',
    shootingTrailColor: '#2EB9DF',
    meteorCount: 3,
    meteorColor: '#e9d5ff',
    meteorMinDuration: 12,
    meteorMaxDuration: 30,
    ...effects,
  };

  return (
    <div
      data-slot="hero-cosmic"
      className={cn('relative', className)}
      style={{ contain: 'paint', clipPath: 'inset(0)' }}
    >
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-950 via-slate-950 to-black">
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

        <div className="relative z-10 container mx-auto max-w-5xl px-4 py-20 text-center">
          {eyebrow ? <div className="mb-8 inline-flex">{eyebrow}</div> : null}

          <h1 className="mb-6 text-5xl font-extrabold tracking-tight md:text-6xl lg:text-7xl">
            {headline}
          </h1>

          {tagline ? (
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-purple-100/90 drop-shadow md:text-xl">
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
