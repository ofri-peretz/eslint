'use client';

import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { StarsBackground, ShootingStars, Meteors } from '@/components/ui/stars-background';
import { cn } from '@/lib/utils';

/**
 * Hero Section Component (Client-side)
 * 
 * Uses StarsBackground + ShootingStars + Meteors for premium cosmic effect.
 * Dark mode: Deep space with purple/cyan shooting stars and meteors
 * Light mode: Soft gradient background with visible stars
 */
export function HeroSection() {
  return (
    <div className="relative" style={{ contain: 'paint', clipPath: 'inset(0)' }}>
      {/* Background Container */}
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-950 via-slate-950 to-black dark:from-purple-950 dark:via-slate-950 dark:to-black">
        {/* Stars Background */}
        <StarsBackground 
          starDensity={0.0002}
          allStarsTwinkle={true}
          twinkleProbability={0.8}
          minTwinkleSpeed={0.4}
          maxTwinkleSpeed={1.2}
        />
        
        {/* Shooting Stars - Single optimized instance (merged from 2 for performance)
             Using wider speed/delay range to maintain visual variety */}
        <ShootingStars
          minSpeed={10}
          maxSpeed={35}
          minDelay={600}
          maxDelay={2500}
          starColor="#c084fc"
          trailColor="#2EB9DF"
          starWidth={10}
          starHeight={1}
        />
        
        {/* Meteors - Aceternity-inspired falling meteor effect */}
        <Meteors
          number={3}
          meteorColor="#e9d5ff"
          minDuration={12}
          maxDuration={30}
        />
        
        {/* Hero Content */}
        <div className="container px-4 py-20 text-center max-w-5xl mx-auto relative z-10">
          {/* Badge */}
          <AnimatedGradientText className="mb-8 inline-flex">
            <span className="inline-flex items-center gap-2">
              <span className="text-lg">🔒</span>
              <hr className="h-4 w-px bg-white/30" />
              <span className="animate-gradient bg-gradient-to-r from-purple-400 via-violet-500 to-purple-400 bg-[length:200%_100%] bg-clip-text text-transparent font-medium">
                Enterprise-Grade Security
              </span>
              <ChevronRight className="size-4 text-white/60" />
            </span>
          </AnimatedGradientText>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
            <span className="text-white drop-shadow-lg">
              Secure your code,
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              your style.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed text-purple-100/90 drop-shadow">
            ESLint Interlace is a comprehensive{' '}
            <span className="text-white font-semibold">security & quality</span>{' '}
            plugin ecosystem. Built for modern JavaScript, designed for teams who care about code integrity.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/docs/getting-started">
              <ShimmerButton
                className="shadow-2xl"
                shimmerColor="#c084fc"
                shimmerSize="0.15em"
                background="linear-gradient(135deg, #8b5cf6, #7c3aed)"
              >
                <span className="flex items-center gap-2 px-6 py-2 text-white font-semibold text-lg">
                  Get Started
                  <ArrowRight className="size-5" />
                </span>
              </ShimmerButton>
            </Link>
            
            <Link
              href="https://github.com/ofri-peretz/eslint"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-white/20 bg-white/10 backdrop-blur-sm px-6 py-3 font-semibold text-white transition-all hover:bg-white/20 hover:border-white/30"
            >
              <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
