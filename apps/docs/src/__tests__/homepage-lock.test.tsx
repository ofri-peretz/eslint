/**
 * Homepage Behavior Lock Tests
 *
 * CRITICAL: These tests lock the homepage structure and behavior.
 * Any changes to the homepage that break these tests require explicit approval.
 *
 * Purpose: Prevent accidental regressions to the homepage layout, components,
 * and visual identity.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// =========================================
// HOMEPAGE STRUCTURE LOCK
// =========================================

describe('Homepage: Structure Lock', () => {
  const homepagePath = join(process.cwd(), 'src/app/(home)/page.tsx');
  let homepageSource: string;

  beforeAll(() => {
    homepageSource = readFileSync(homepagePath, 'utf-8');
  });

  it('homepage file exists', () => {
    expect(existsSync(homepagePath)).toBe(true);
  });

  it('is a server component (async function)', () => {
    expect(homepageSource).toContain('export default async function HomePage');
  });

  describe('Required Imports', () => {
    it('imports HeroSection component', () => {
      expect(homepageSource).toContain("import { HeroSection } from '@/components/home/hero-section'");
    });

    it('imports BackgroundLines component', () => {
      expect(homepageSource).toContain("import { BackgroundLines } from '@/components/ui/background-lines'");
    });

    it('imports BorderBeam component', () => {
      expect(homepageSource).toContain("import { BorderBeam } from '@/components/ui/border-beam'");
    });

    it('imports NumberTicker component', () => {
      expect(homepageSource).toContain("import { NumberTicker } from '@/components/ui/number-ticker'");
    });

    it('imports Marquee component', () => {
      expect(homepageSource).toContain("import { Marquee } from '@/components/ui/marquee'");
    });

    it('imports TweetCard component', () => {
      expect(homepageSource).toContain("import { TweetCard } from '@/components/ui/tweet-card'");
    });

    it('imports stats loader', () => {
      expect(homepageSource).toContain("import { getDisplayStats } from '@/lib/stats-loader'");
    });
  });

  describe('Required Sections', () => {
    it('renders HeroSection component', () => {
      expect(homepageSource).toContain('<HeroSection');
    });

    it('contains STATS BAR section', () => {
      expect(homepageSource).toContain('STATS BAR');
    });

    it('contains DOCS PREVIEW section', () => {
      expect(homepageSource).toContain('DOCS PREVIEW');
    });

    it('contains SECURITY section via Two Pillars', () => {
      expect(homepageSource).toContain('Security Pillar');
    });

    it('contains QUALITY section via Two Pillars', () => {
      expect(homepageSource).toContain('Quality Pillar');
    });

    it('contains COMMUNITY section', () => {
      expect(homepageSource).toContain('Loved by the Community');
    });
  });

  describe('Plugin Configuration', () => {
    it('defines securityPlugins array', () => {
      expect(homepageSource).toContain('const securityPlugins');
    });

    it('defines qualityPlugins array', () => {
      expect(homepageSource).toContain('const qualityPlugins');
    });

    it('includes browser-security plugin', () => {
      expect(homepageSource).toContain("name: 'browser-security'");
    });

    it('includes jwt plugin', () => {
      expect(homepageSource).toContain("name: 'jwt'");
    });

    it('includes express-security plugin', () => {
      expect(homepageSource).toContain("name: 'express-security'");
    });
  });
});

// =========================================
// HERO SECTION LOCK
// =========================================

describe('HeroSection: Structure Lock', () => {
  const heroPath = join(process.cwd(), 'src/components/home/hero-section.tsx');
  let heroSource: string;

  beforeAll(() => {
    heroSource = readFileSync(heroPath, 'utf-8');
  });

  it('hero section file exists', () => {
    expect(existsSync(heroPath)).toBe(true);
  });

  it('is a client component', () => {
    expect(heroSource).toContain("'use client'");
  });

  describe('Shooting Stars Integration', () => {
    it('imports StarsBackground component', () => {
      expect(heroSource).toContain("StarsBackground");
    });

    it('imports ShootingStars component', () => {
      expect(heroSource).toContain("ShootingStars");
    });

    it('imports from stars-background.tsx', () => {
      expect(heroSource).toContain("from '@/components/ui/stars-background'");
    });

    it('renders StarsBackground component', () => {
      expect(heroSource).toContain('<StarsBackground');
    });

    it('renders ShootingStars component', () => {
      expect(heroSource).toContain('<ShootingStars');
    });

    it('has customized star density', () => {
      expect(heroSource).toContain('starDensity=');
    });

    it('has customized star color (purple)', () => {
      expect(heroSource).toMatch(/starColor.*#[a-fA-F0-9]{6}/);
    });

    it('has customized trail color (cyan)', () => {
      expect(heroSource).toMatch(/trailColor.*#[a-fA-F0-9]{6}/);
    });
  });

  describe('Content Structure', () => {
    it('contains main headline text', () => {
      expect(heroSource).toContain('Secure your code');
    });

    it('contains gradient headline text', () => {
      expect(heroSource).toContain('your style');
    });

    it('contains security badge', () => {
      expect(heroSource).toContain('Enterprise-Grade Security');
    });

    it('contains subheadline text', () => {
      expect(heroSource).toContain('plugin ecosystem');
    });

    it('contains Get Started CTA', () => {
      expect(heroSource).toContain('Get Started');
    });

    it('contains GitHub CTA', () => {
      expect(heroSource).toContain('GitHub');
    });

    it('links to getting started docs', () => {
      expect(heroSource).toContain("href=\"/docs/getting-started\"");
    });

    it('links to GitHub repository', () => {
      expect(heroSource).toContain("href=\"https://github.com/ofri-peretz/eslint\"");
    });
  });

  describe('Visual Styling', () => {
    it('has paint containment for performance', () => {
      expect(heroSource).toContain("contain: 'paint'");
    });

    it('has clip path for overflow handling', () => {
      expect(heroSource).toContain("clipPath: 'inset(0)'");
    });

    it('uses cosmic gradient background', () => {
      expect(heroSource).toContain('bg-gradient-to-b from-purple-950');
    });

    it('has min-h-screen for full viewport', () => {
      expect(heroSource).toContain('min-h-screen');
    });

    it('content has z-10 for proper layering', () => {
      expect(heroSource).toContain('z-10');
    });
  });

  describe('Component Dependencies', () => {
    it('imports ShimmerButton', () => {
      expect(heroSource).toContain("import { ShimmerButton }");
    });

    it('imports AnimatedGradientText', () => {
      expect(heroSource).toContain("import { AnimatedGradientText }");
    });

    it('imports Link from next/link', () => {
      expect(heroSource).toContain("import Link from 'next/link'");
    });

    it('imports icons from lucide-react', () => {
      expect(heroSource).toContain("from 'lucide-react'");
    });
  });
});

// =========================================
// HOMEPAGE ACCESSIBILITY
// =========================================

describe('Homepage: Accessibility Lock', () => {
  const heroPath = join(process.cwd(), 'src/components/home/hero-section.tsx');
  let heroSource: string;

  beforeAll(() => {
    heroSource = readFileSync(heroPath, 'utf-8');
  });

  it('uses h1 for main headline', () => {
    expect(heroSource).toContain('<h1');
  });

  it('uses semantic paragraph for description', () => {
    expect(heroSource).toContain('<p');
  });

  it('CTA links are proper anchor elements', () => {
    expect(heroSource).toContain('<Link');
  });

  it('text has drop-shadow for contrast', () => {
    expect(heroSource).toContain('drop-shadow');
  });

  it('uses white text on dark background for WCAG contrast', () => {
    expect(heroSource).toContain('text-white');
  });
});

// =========================================
// CODE BLOCK ACCESSIBILITY LOCK
// =========================================

describe('Homepage: Code Block WCAG Compliance', () => {
  const homepagePath = join(process.cwd(), 'src/app/(home)/page.tsx');
  let homepageSource: string;

  beforeAll(() => {
    homepageSource = readFileSync(homepagePath, 'utf-8');
  });

  describe('Light/Dark Theme Color Contrast', () => {
    it('uses theme-aware purple for keywords (WCAG 4.5:1 contrast)', () => {
      expect(homepageSource).toContain('text-purple-600 dark:text-purple-400');
    });

    it('uses theme-aware amber/yellow for identifiers (WCAG 4.5:1 contrast)', () => {
      expect(homepageSource).toContain('text-amber-600 dark:text-yellow-400');
    });

    it('uses theme-aware green for strings (WCAG 4.5:1 contrast)', () => {
      expect(homepageSource).toContain('text-green-600 dark:text-green-400');
    });

    it('uses fd-muted-foreground for comments (theme-aware)', () => {
      expect(homepageSource).toContain('text-fd-muted-foreground');
    });
  });

  describe('Code Block Structure', () => {
    it('has WCAG comment indicating accessible colors', () => {
      expect(homepageSource).toContain('WCAG accessible colors');
    });

    it('uses monospace font for code', () => {
      expect(homepageSource).toContain('font-mono');
    });

    it('contains eslint.config.js filename', () => {
      expect(homepageSource).toContain('eslint.config.js');
    });
  });
});

// =========================================
// METEORS CONFIGURATION LOCK
// =========================================

describe('HeroSection: Meteors Lock', () => {
  const heroPath = join(process.cwd(), 'src/components/home/hero-section.tsx');
  let heroSource: string;

  beforeAll(() => {
    heroSource = readFileSync(heroPath, 'utf-8');
  });

  it('imports Meteors component', () => {
    expect(heroSource).toContain('Meteors');
  });

  it('renders Meteors component', () => {
    expect(heroSource).toContain('<Meteors');
  });

  it('has configured meteor color', () => {
    expect(heroSource).toContain('meteorColor=');
  });

  it('has configured minimum duration', () => {
    expect(heroSource).toContain('minDuration=');
  });

  it('has configured maximum duration', () => {
    expect(heroSource).toContain('maxDuration=');
  });
});

// =========================================
// VISUAL IDENTITY LOCK
// =========================================

describe('Homepage: Visual Identity Lock', () => {
  const homepagePath = join(process.cwd(), 'src/app/(home)/page.tsx');
  let homepageSource: string;

  beforeAll(() => {
    homepageSource = readFileSync(homepagePath, 'utf-8');
  });

  describe('Brand Colors', () => {
    it('uses orange accent for security pillar', () => {
      expect(homepageSource).toContain('text-orange-500');
    });

    it('uses purple accent for quality pillar', () => {
      expect(homepageSource).toContain('text-purple-500');
    });

    it('uses gradient CTA styling', () => {
      expect(homepageSource).toContain('from-purple-500');
    });
  });

  describe('Section Structure', () => {
    it('has Two Pillars section', () => {
      expect(homepageSource).toContain('Two Pillars of Excellence');
    });

    it('has Why section', () => {
      expect(homepageSource).toContain('Why ESLint Interlace?');
    });

    it('has Final CTA section', () => {
      expect(homepageSource).toContain('Ready to Level Up?');
    });
  });

  describe('Interactive Elements', () => {
    it('uses ShimmerButton for primary CTAs', () => {
      expect(homepageSource).toContain('<ShimmerButton');
    });

    it('uses BorderBeam for visual enhancement', () => {
      expect(homepageSource).toContain('<BorderBeam');
    });

    it('uses Marquee for plugin showcase', () => {
      expect(homepageSource).toContain('<Marquee');
    });
  });
});
