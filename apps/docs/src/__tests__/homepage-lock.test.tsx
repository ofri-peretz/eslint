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
      expect(homepageSource).toContain(
        "import { HeroSection } from '@/components/home/hero-section'",
      );
    });

    // Home-page diet (2026-05): BackgroundLines and Marquee retired in favor
    // of quieter sections. Lock asserts they are NOT re-introduced.
    it('does NOT re-import BackgroundLines (retired in 2026-05 home-page diet)', () => {
      expect(homepageSource).not.toContain(
        "from '@interlace/ui/aceternity/background-lines'",
      );
    });

    it('does NOT re-import Marquee (retired in 2026-05 home-page diet)', () => {
      expect(homepageSource).not.toContain(
        "from '@interlace/ui/magicui/marquee'",
      );
    });

    it('imports BorderBeam component', () => {
      expect(homepageSource).toContain(
        "import { BorderBeam } from '@interlace/ui/magicui/border-beam'",
      );
    });

    it('imports NumberTicker component', () => {
      expect(homepageSource).toContain(
        "import { NumberTicker } from '@interlace/ui/magicui/number-ticker'",
      );
    });

    it('imports TweetCard from the @interlace/docs-baseline marketing layer', () => {
      expect(homepageSource).toContain(
        "import { TweetCard } from '#interlace/components/marketing/tweet-card'",
      );
    });

    it('imports DevToCard from the @interlace/docs-baseline marketing layer', () => {
      expect(homepageSource).toContain(
        "import { DevToCard } from '#interlace/components/marketing/devto-card'",
      );
    });

    it('wires cache-aware fetchers via createTweetFetcher / createDevToFetcher', () => {
      expect(homepageSource).toContain('createTweetFetcher');
      expect(homepageSource).toContain('createDevToFetcher');
    });

    it('imports stats loader', () => {
      expect(homepageSource).toContain(
        "import { getDisplayStats } from '@/lib/stats-loader'",
      );
    });
  });

  describe('Required Sections', () => {
    it('renders HeroSection component', () => {
      expect(homepageSource).toContain('<HeroSection');
    });

    it('contains STATS BAR section', () => {
      expect(homepageSource).toContain('STATS BAR');
    });

    // RUNTIME STRIP (added 2026-05) — engine-portability signal lives
    // adjacent to the hero, NOT inside it (the hero CTAs are locked).
    // INTEROP_PHILOSOPHY.md is the canonical source for engine statuses;
    // the strip is the user-facing surface that introduces them.
    it('contains RUNTIME STRIP section between HERO and STATS BAR', () => {
      expect(homepageSource).toContain('RUNTIME STRIP');
      const stripIdx = homepageSource.indexOf('RUNTIME STRIP');
      const statsIdx = homepageSource.indexOf('STATS BAR');
      expect(stripIdx).toBeGreaterThan(-1);
      expect(stripIdx).toBeLessThan(statsIdx);
    });

    it('runtime strip lists ESLint as the floor engine', () => {
      expect(homepageSource).toMatch(/ESLint[\s\S]{0,80}floor/);
    });

    it('runtime strip lists Oxlint as automated peer (matches INTEROP_PHILOSOPHY.md support matrix)', () => {
      expect(homepageSource).toMatch(/Oxlint[\s\S]{0,80}automated peer/);
    });

    it('runtime strip lists Biome as reserved peer (matches INTEROP_PHILOSOPHY.md support matrix)', () => {
      expect(homepageSource).toMatch(/Biome[\s\S]{0,80}reserved peer/);
    });

    it('runtime strip lists TSC native (Go) as watching — never claims "TSC 7 compatible" (status is `watching` per INTEROP_PHILOSOPHY.md)', () => {
      expect(homepageSource).toMatch(/TSC native[\s\S]{0,80}watching/);
      // The host is Go, not Rust — Oxlint and Biome are Rust. Pin this
      // because the user's mental model conflates the two languages.
      expect(homepageSource).toContain('TSC native (Go)');
      // Negative lock: must NOT promise compatibility with TSC 7 (status is "watching", not "compatible").
      expect(homepageSource).not.toMatch(/compatible[\s\S]{0,40}TSC\s*7/i);
      expect(homepageSource).not.toMatch(/TSC\s*7[\s\S]{0,40}compatible/i);
    });

    it('runtime strip cross-links to /docs/getting-started/concepts/runtime-portability', () => {
      expect(homepageSource).toContain(
        '/docs/getting-started/concepts/runtime-portability',
      );
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

    it('contains SOCIAL PROOF section (renamed from COMMUNITY in 2026-05 diet)', () => {
      expect(homepageSource).toContain('Trusted by developers');
    });

    it('contains WHAT IT CATCHES section (replaces PLUGIN MARQUEE in 2026-05 diet)', () => {
      expect(homepageSource).toContain('What it catches');
    });
  });

  describe('What-It-Catches Section (CWE-driven adoption signal)', () => {
    it('uses CatchCard component for vulnerability examples', () => {
      expect(homepageSource).toContain('<CatchCard');
    });

    it('defines CatchCard component locally', () => {
      expect(homepageSource).toContain('function CatchCard');
    });

    it('shows the SQL-injection example (CWE-89, pg/no-unsafe-query)', () => {
      expect(homepageSource).toContain('CWE-89');
      expect(homepageSource).toContain('pg/no-unsafe-query');
    });

    it('shows the JWT-algorithm-confusion example (CWE-347, jwt/no-algorithm-none)', () => {
      expect(homepageSource).toContain('CWE-347');
      expect(homepageSource).toContain('jwt/no-algorithm-none');
    });

    it('shows the XSS example (CWE-79, browser-security/no-innerhtml)', () => {
      expect(homepageSource).toContain('CWE-79');
      expect(homepageSource).toContain('browser-security/no-innerhtml');
    });

    it('links to the full CWE coverage matrix (moved under Concepts/Ecosystem in 2026-05-10 IA pass)', () => {
      expect(homepageSource).toContain(
        '/docs/getting-started/concepts/cwe-compatibility',
      );
    });
  });
});

// =========================================
// HERO SECTION LOCK
// =========================================

describe('HeroSection: Structure Lock', () => {
  // The hero is composed of: the app's hero-section.tsx (branded copy + CTAs),
  // the @interlace/ui/patterns/hero-cosmic preset (theme-aware atmospheric
  // shell + structural skeleton), and the @interlace/ui/aceternity/daylight-
  // background primitive (sun + clouds + sky for light theme). Lock-tests
  // assert against all three as one logical unit.
  const heroPath = join(process.cwd(), 'src/components/home/hero-section.tsx');
  const cosmicPath = join(
    process.cwd(),
    '../../packages/ui/src/patterns/hero-cosmic.tsx',
  );
  const daylightPath = join(
    process.cwd(),
    '../../packages/ui/src/aceternity/daylight-background.tsx',
  );
  let heroSource: string;

  beforeAll(() => {
    heroSource =
      readFileSync(heroPath, 'utf-8') +
      '\n\n/* --- @interlace/ui/patterns/hero-cosmic --- */\n\n' +
      readFileSync(cosmicPath, 'utf-8') +
      '\n\n/* --- @interlace/ui/aceternity/daylight-background --- */\n\n' +
      readFileSync(daylightPath, 'utf-8');
  });

  it('hero section file exists', () => {
    expect(existsSync(heroPath)).toBe(true);
  });

  it('is a client component', () => {
    expect(heroSource).toContain("'use client'");
  });

  describe('Shooting Stars Integration', () => {
    it('imports StarsBackground component', () => {
      expect(heroSource).toContain('StarsBackground');
    });

    it('imports ShootingStars component', () => {
      expect(heroSource).toContain('ShootingStars');
    });

    it('imports from the @interlace/ui aceternity stars-background', () => {
      // The hero-cosmic preset re-uses stars-background via a relative
      // package path (`../aceternity/stars-background.js`); the app-side
      // hero-section can also import from the public `@interlace/ui/...`
      // subpath. Either is a valid wiring of the same module.
      expect(heroSource).toMatch(
        /(@interlace\/ui\/aceternity\/stars-background|\.\.\/aceternity\/stars-background)/,
      );
    });

    it('renders StarsBackground component', () => {
      expect(heroSource).toContain('<StarsBackground');
    });

    it('renders ShootingStars component', () => {
      expect(heroSource).toContain('<ShootingStars');
    });

    it('has customized star density', () => {
      expect(heroSource).toContain('starDensity');
    });

    it('has customized star color (purple)', () => {
      // Now lives as a default in HeroCosmic's `effects.shootingStarColor`.
      expect(heroSource).toMatch(
        /(starColor|shootingStarColor)[\s\S]{0,40}#[a-fA-F0-9]{6}/,
      );
    });

    it('has customized trail color (cyan)', () => {
      expect(heroSource).toMatch(
        /(trailColor|shootingTrailColor)[\s\S]{0,40}#[a-fA-F0-9]{6}/,
      );
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
      expect(heroSource).toContain('href="/docs/getting-started"');
    });

    it('links to GitHub repository', () => {
      // The URL may appear as `href="..."` (JSX prop) or `href: '...'` (cta
      // object). Either is acceptable — what matters is the URL is present.
      expect(heroSource).toContain('https://github.com/ofri-peretz/eslint');
    });
  });

  describe('Visual Styling', () => {
    it('has paint containment for performance', () => {
      expect(heroSource).toContain("contain: 'paint'");
    });

    it('has clip path for overflow handling', () => {
      expect(heroSource).toContain("clipPath: 'inset(0)'");
    });

    it('uses cosmic gradient background (theme-prefixed Tailwind v4 — light theme uses daylight surface)', () => {
      // After the 2026-05 daylight restoration, the cosmic gradient is gated
      // behind the `dark:` Tailwind variant so the same wrapper carries both
      // surfaces. The migration to Tailwind v4 canonical `bg-linear-to-b`
      // happened at the same time, so accept both the legacy and canonical
      // forms (with or without the `dark:` prefix) — what matters is that
      // the deep-purple gradient stays paired with the cosmic surface.
      expect(heroSource).toMatch(
        /(?:bg-(?:gradient|linear)-to-b\s+from-purple-950|dark:bg-(?:gradient|linear)-to-b\s+dark:from-purple-950)/,
      );
    });

    it('has min-h-screen for full viewport', () => {
      expect(heroSource).toContain('min-h-screen');
    });

    it('content has z-10 for proper layering', () => {
      expect(heroSource).toContain('z-10');
    });
  });

  describe('Component Dependencies', () => {
    it('imports ShimmerButton for the hero primary (CTA_PHILOSOPHY.md #8 — animated CTA reserved for the surface primary)', () => {
      expect(heroSource).toContain('import { ShimmerButton }');
    });

    it('uses exactly two ShimmerButton instances in the hero (CTA_PHILOSOPHY.md #3 sibling parity — same component for both CTAs)', () => {
      // Strip JSDoc/line comments so doc references like `<ShimmerButton>`
      // in the file header don't inflate the count. We only want JSX opens.
      const codeOnly = heroSource
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      const matches = codeOnly.match(/<ShimmerButton[\s>]/g) ?? [];
      expect(matches.length).toBe(2);
    });

    it('secondary ShimmerButton passes both `shimmer={false}` and `highlight={false}` (no rotating spark, no white inset)', () => {
      expect(heroSource).toContain('shimmer={false}');
      expect(heroSource).toContain('highlight={false}');
    });

    // The previous assert only checked that the strings appear *somewhere* in
    // the hero file. It would pass even if `shimmer={false}` ended up on the
    // PRIMARY button and the secondary regained the rotating spark. The next
    // three asserts pin the per-button contract.
    it('PRIMARY ShimmerButton does NOT carry `shimmer={false}` (it keeps the rotating spark — CTA_PHILOSOPHY #8)', () => {
      const codeOnly = heroSource
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      // Capture each ShimmerButton opening-tag block (everything from `<ShimmerButton` to the first `>`).
      const opens = codeOnly.match(/<ShimmerButton\b[\s\S]*?>/g) ?? [];
      expect(opens.length).toBe(2);
      expect(opens[0]).not.toMatch(/shimmer=\{false\}/);
      expect(opens[0]).not.toMatch(/highlight=\{false\}/);
    });

    it('SECONDARY ShimmerButton carries BOTH `shimmer={false}` AND `highlight={false}` in the same JSX element (CTA_PHILOSOPHY #3 sibling parity, #8 animation budget)', () => {
      const codeOnly = heroSource
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      const opens = codeOnly.match(/<ShimmerButton\b[\s\S]*?>/g) ?? [];
      expect(opens.length).toBe(2);
      expect(opens[1]).toMatch(/shimmer=\{false\}/);
      expect(opens[1]).toMatch(/highlight=\{false\}/);
    });

    it('SECONDARY ShimmerButton contains the GitHub mark + "Star on GitHub" label (catches a future "make it a Docs button" refactor)', () => {
      // The GitHub viewBox / `M12 0c-6.626` head are distinctive; pin those + the label.
      expect(heroSource).toContain('viewBox="0 0 24 24"');
      expect(heroSource).toMatch(/<path\s+d="M12 0c-6\.626/);
      // Label became a conversion-framed "Star on GitHub" ask (2026-05 growth
      // pass). A refactor back to a bare "GitHub"/"Docs" label regresses the
      // npm→GitHub funnel — pin the literal.
      expect(heroSource).toContain('Star on GitHub');
    });

    it('SECONDARY CTA fires the homepage:star_click funnel event on click (GROWTH_PHILOSOPHY.md G1/G2 — npm→GitHub conversion measurement)', () => {
      expect(heroSource).toContain("track('homepage:star_click'");
    });

    it('SECONDARY CTA surfaces the live star count only past the social-proof threshold (never advertises a low number)', () => {
      expect(heroSource).toMatch(/githubStars\s*&&\s*githubStars\s*>=\s*100/);
    });

    it('HeroCosmic `secondaryCta.label` slot is a `<ShimmerButton …>` (structural lock — refactors that swap the slot break this)', () => {
      // `secondaryCta={` … `label: ( <ShimmerButton …` — the `label:` value
      // immediately under `secondaryCta` must open with ShimmerButton.
      expect(heroSource).toMatch(
        /secondaryCta=\{[\s\S]*?label:\s*\(\s*<ShimmerButton\b/,
      );
    });

    it('does NOT re-import AnimatedGradientText (retired from hero eyebrow in 2026-05 diet)', () => {
      const heroOnly = heroSource.split(
        '/* --- @interlace/ui/patterns/hero-cosmic --- */',
      )[0];
      expect(heroOnly).not.toContain('import { AnimatedGradientText }');
    });

    it('imports Link from next/link', () => {
      expect(heroSource).toContain("import Link from 'next/link'");
    });

    it('imports icons from lucide-react', () => {
      expect(heroSource).toContain("from 'lucide-react'");
    });
  });

  // LAYOUT_PHILOSOPHY §3 enforcement on the hero. The tagline-to-CTA gap is
  // a recurring regression target: when the file gets refactored, it drifts
  // back to `mb-10` (40px, the mobile-section default) which reads cramped
  // against the 5xl/6xl/7xl hero headline. Lock the `xl` token (64px / `mb-16`).
  describe('Layout invariants (LAYOUT_PHILOSOPHY §3)', () => {
    it('tagline → CTA gap uses the `xl` spacing token (`mb-16`, 64px) — hero surfaces breathe', () => {
      // The hero-cosmic pattern owns the gap; assert against the concatenated
      // source so any future "consolidate the hero markup into hero-section"
      // refactor still trips this lock.
      expect(heroSource).toMatch(/<p[^>]*\bmb-16\b[^>]*>/);
      // Negative lock — the previous value must not return.
      expect(heroSource).not.toMatch(/<p[^>]*\bmb-10\b[^>]*>/);
    });
  });
});

// =========================================
// HOMEPAGE ACCESSIBILITY
// =========================================

describe('Homepage: Accessibility Lock', () => {
  // Same composite hero source as the structure-lock block above — see that
  // block's header for the rationale.
  const heroPath = join(process.cwd(), 'src/components/home/hero-section.tsx');
  const cosmicPath = join(
    process.cwd(),
    '../../packages/ui/src/patterns/hero-cosmic.tsx',
  );
  const daylightPath = join(
    process.cwd(),
    '../../packages/ui/src/aceternity/daylight-background.tsx',
  );
  let heroSource: string;

  beforeAll(() => {
    heroSource =
      readFileSync(heroPath, 'utf-8') +
      '\n\n/* --- @interlace/ui/patterns/hero-cosmic --- */\n\n' +
      readFileSync(cosmicPath, 'utf-8') +
      '\n\n/* --- @interlace/ui/aceternity/daylight-background --- */\n\n' +
      readFileSync(daylightPath, 'utf-8');
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
  // Same composite hero source as the structure-lock block above — see that
  // block's header for the rationale.
  const heroPath = join(process.cwd(), 'src/components/home/hero-section.tsx');
  const cosmicPath = join(
    process.cwd(),
    '../../packages/ui/src/patterns/hero-cosmic.tsx',
  );
  const daylightPath = join(
    process.cwd(),
    '../../packages/ui/src/aceternity/daylight-background.tsx',
  );
  let heroSource: string;

  beforeAll(() => {
    heroSource =
      readFileSync(heroPath, 'utf-8') +
      '\n\n/* --- @interlace/ui/patterns/hero-cosmic --- */\n\n' +
      readFileSync(cosmicPath, 'utf-8') +
      '\n\n/* --- @interlace/ui/aceternity/daylight-background --- */\n\n' +
      readFileSync(daylightPath, 'utf-8');
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

  // ──────────────────────────────────────────────────────────────────
  // Nuxt blog-old parity asserts — these defaults were the source of
  // "the meteors feel weird" in May 2026. The cosmic surface drifted
  // from the original blog (faster shooting stars, denser starfield)
  // when it was ported. Each value below is pinned against
  // `apps/blog-old/app/components/CosmicBackground.vue` so a future
  // refactor can't silently re-introduce the drift.
  // ──────────────────────────────────────────────────────────────────

  it('cosmic meteor color matches Nuxt blog-old (`#e9d5ff`)', () => {
    expect(heroSource).toContain("meteorColor: '#e9d5ff'");
  });

  it('cosmic meteor count matches Nuxt blog-old (3, NOT the 22 from the registry primitive)', () => {
    expect(heroSource).toMatch(/meteorCount:\s*3\b/);
  });

  it('cosmic meteor duration window matches Nuxt blog-old (12–30s, NOT 3–9s)', () => {
    expect(heroSource).toMatch(/meteorMinDuration:\s*12\b/);
    expect(heroSource).toMatch(/meteorMaxDuration:\s*30\b/);
  });

  it('cosmic shooting-star cadence matches Nuxt blog-old (delay 1200–4200ms, speed 10–30)', () => {
    expect(heroSource).toMatch(/shootingMinDelay:\s*1200\b/);
    expect(heroSource).toMatch(/shootingMaxDelay:\s*4200\b/);
    expect(heroSource).toMatch(/shootingMinSpeed:\s*10\b/);
    expect(heroSource).toMatch(/shootingMaxSpeed:\s*30\b/);
  });

  it('cosmic star density matches Nuxt blog-old (0.00015, NOT 0.0002)', () => {
    expect(heroSource).toMatch(/starDensity:\s*0\.00015\b/);
  });
});

// =========================================
// DAYLIGHT SURFACE LOCK
// =========================================
// Restores the light-theme atmospheric surface (sun + clouds + sky)
// that was missing from the shadcn port. The Nuxt blog-old hero
// shipped a theme-aware twin — cosmic at night, daylight in light
// mode — and the regression policy at the top of CLAUDE.md mandates
// a lock for every restored surface so it can't silently disappear
// again on a future refactor.

describe('HeroSection: Daylight Surface Lock', () => {
  const heroPath = join(process.cwd(), 'src/components/home/hero-section.tsx');
  const cosmicPath = join(
    process.cwd(),
    '../../packages/ui/src/patterns/hero-cosmic.tsx',
  );
  const daylightPath = join(
    process.cwd(),
    '../../packages/ui/src/aceternity/daylight-background.tsx',
  );
  let heroSource: string;
  let daylightSource: string;

  beforeAll(() => {
    daylightSource = readFileSync(daylightPath, 'utf-8');
    heroSource =
      readFileSync(heroPath, 'utf-8') +
      '\n\n/* --- @interlace/ui/patterns/hero-cosmic --- */\n\n' +
      readFileSync(cosmicPath, 'utf-8') +
      '\n\n/* --- @interlace/ui/aceternity/daylight-background --- */\n\n' +
      daylightSource;
  });

  describe('Primitives exist in the @interlace/ui aceternity surface', () => {
    it('daylight-background.tsx file exists', () => {
      expect(existsSync(daylightPath)).toBe(true);
    });

    it('exports SkyGradient primitive', () => {
      expect(daylightSource).toMatch(/export\s+function\s+SkyGradient\b/);
    });

    it('exports Sun primitive', () => {
      expect(daylightSource).toMatch(/export\s+function\s+Sun\b/);
    });

    it('exports CloudParticle primitive', () => {
      expect(daylightSource).toMatch(/export\s+function\s+CloudParticle\b/);
    });

    it('exports DaylightBackground convenience wrapper', () => {
      expect(daylightSource).toMatch(
        /export\s+function\s+DaylightBackground\b/,
      );
    });
  });

  describe('Wiring — HeroCosmic mounts the daylight layer behind the dark:hidden gate', () => {
    it('hero-cosmic.tsx imports DaylightBackground from the aceternity surface', () => {
      expect(heroSource).toMatch(
        /import\s+\{\s*DaylightBackground\s*\}\s+from\s+['"]\.\.\/aceternity\/daylight-background\.js['"]/,
      );
    });

    it('hero-cosmic.tsx renders <DaylightBackground …> inside a `block dark:hidden` wrapper', () => {
      // The light surface is opt-out by being hidden in dark mode. Lock
      // both halves: the toggle class AND the component instance must
      // co-exist in the source.
      expect(heroSource).toContain('block dark:hidden');
      expect(heroSource).toMatch(/<DaylightBackground\b/);
    });

    it('hero-cosmic.tsx renders cosmic primitives inside a `hidden dark:block` wrapper (negative parity)', () => {
      // The dark surface is opt-out by being hidden in light mode. Pairs
      // with the daylight lock above so neither side can be deleted
      // without breaking the other.
      expect(heroSource).toContain('hidden dark:block');
    });

    it('daylight surface accepts cloud/sun tuning knobs (`daylight` prop)', () => {
      expect(heroSource).toMatch(/daylight\?:\s*\{/);
      expect(heroSource).toMatch(/showSun\?:\s*boolean/);
      expect(heroSource).toMatch(/showClouds\?:\s*boolean/);
      expect(heroSource).toMatch(/cloudCount\?:\s*number/);
    });
  });

  describe('SVG cloud filter — matches the Nuxt CloudParticle.vue volumetric matrix', () => {
    // The 5-layer feMerge stack was hand-tuned in the original Vue
    // component to match Framer's cloud aesthetic. Re-deriving it
    // risks visual drift, so lock the structural shape.
    it('CloudParticle defines a 5-layer feMerge stack (volumetric depth)', () => {
      const merges = daylightSource.match(/<feMergeNode\b/g) ?? [];
      expect(merges.length).toBeGreaterThanOrEqual(4);
    });

    it('CloudParticle uses dual feTurbulence sources (detail + broad)', () => {
      const turbs = daylightSource.match(/<feTurbulence\b/g) ?? [];
      expect(turbs.length).toBe(2);
    });

    it('CloudParticle uses fractalNoise (not turbulence) for organic shapes', () => {
      expect(daylightSource).toContain('fractalNoise');
    });

    it('CloudParticle preserves the blue-tinted underside shadow (rgb(66,105,146))', () => {
      // The under-cloud shadow color is what makes the clouds read as
      // "lit from above" instead of flat. The exact value is from the
      // Nuxt source — don't drift it.
      expect(daylightSource).toMatch(/rgb\(\s*66\s*,\s*105\s*,\s*146\s*\)/);
    });
  });

  describe('Sun rendering — corona + glow + core + rotating rays + lens flares', () => {
    it('Sun renders an outer + middle corona (atmospheric diffraction)', () => {
      expect(daylightSource).toContain('interlace-sun-corona-outer');
      expect(daylightSource).toContain('interlace-sun-corona-middle');
    });

    it('Sun renders an overexposed core (the bright disk)', () => {
      expect(daylightSource).toContain('interlace-sun-core');
    });

    it('Sun renders conic-gradient rays animated over 120s (matches Nuxt)', () => {
      expect(daylightSource).toMatch(
        /animation:\s*interlace-sun-rays-rotate\s+120s/,
      );
    });

    it('Sun honors prefers-reduced-motion (rays animation is killed)', () => {
      expect(daylightSource).toMatch(
        /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,200}interlace-sun-rays[\s\S]{0,80}animation:\s*none/,
      );
    });

    it('Sun renders both horizontal + vertical lens flares (anamorphic look)', () => {
      expect(daylightSource).toContain('interlace-lens-flare-h');
      expect(daylightSource).toContain('interlace-lens-flare-v');
    });
  });

  describe('Sky gradient — five-layer atmospheric scattering', () => {
    it('SkyGradient uses HSL Rayleigh-scattered base (210→195→45 hue ramp)', () => {
      expect(daylightSource).toMatch(/hsl\(210,\s*80%,\s*55%\)/);
      expect(daylightSource).toMatch(/hsl\(45,\s*50%,\s*88%\)/);
    });

    it('SkyGradient renders the horizon warm-glow layer (golden-hour band)', () => {
      expect(daylightSource).toContain('interlace-sky-horizon');
    });

    it('SkyGradient renders the vignette layer (subtle depth cue)', () => {
      expect(daylightSource).toContain('interlace-sky-vignette');
    });
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

    it('has How it works section (surfaces Concepts corpus — Philosophy / AST / Detect→Understand→Fix)', () => {
      expect(homepageSource).toContain('How it works');
      expect(homepageSource).toContain(
        '/docs/getting-started/concepts/philosophy',
      );
      expect(homepageSource).toContain(
        '/docs/getting-started/concepts/ast-fundamentals',
      );
      expect(homepageSource).toContain(
        '/docs/getting-started/concepts/detect-understand-fix',
      );
    });

    it('has Our edges section (Compatibility / Benchmarks / AI Leverage — replaces generic "Why" grid in 2026-05-10 edges pass)', () => {
      expect(homepageSource).toContain('Our edges');
      expect(homepageSource).toContain(
        '/docs/getting-started/concepts/compatibility',
      );
      expect(homepageSource).toContain(
        '/docs/getting-started/concepts/benchmarks',
      );
      expect(homepageSource).toContain(
        '/docs/getting-started/concepts/ai-integration',
      );
    });

    // Runtime-portability card lives inside "Our edges" — its copy must
    // namedrop ESLint, Oxlint, AND the TSC native plugin host. The card is
    // the second user-facing surface (after the hero strip) where the
    // engine-portability story lands. Wording drift here is a regression.
    it('Our edges grid contains the Runtime Portability card with all three engines named (ESLint + Oxlint + TSC native)', () => {
      expect(homepageSource).toContain('Runtime Portability');
      expect(homepageSource).toContain(
        '/docs/getting-started/concepts/runtime-portability',
      );
      // Per INTEROP_PHILOSOPHY.md §"Vision": the TSC native host is the
      // long-horizon target. Card copy MUST name it so the message isn't
      // limited to "Oxlint and ESLint."
      const cardChunk = homepageSource.slice(
        homepageSource.indexOf('Runtime Portability'),
      );
      expect(cardChunk).toMatch(/ESLint/);
      expect(cardChunk).toMatch(/Oxlint/);
      expect(cardChunk).toMatch(/TSC native/);
    });

    it('has Final CTA section', () => {
      expect(homepageSource).toContain('Ready to Level Up?');
    });

    it("has What's next pair under final CTA (UX_PHILOSOPHY §4 — compare / CWE matrix)", () => {
      expect(homepageSource).toContain('Not ready yet? Explore');
      expect(homepageSource).toContain(
        '/docs/getting-started/concepts/compare',
      );
      expect(homepageSource).toContain(
        '/docs/getting-started/concepts/cwe-compatibility',
      );
    });
  });

  describe('Interactive Elements', () => {
    it('uses ShimmerButton for the final-CTA primary (CTA_PHILOSOPHY.md #8 — final-CTA banner is its own marketing surface, allowed one animated primary)', () => {
      expect(homepageSource).toContain('<ShimmerButton');
    });

    it('uses BorderBeam for visual enhancement', () => {
      expect(homepageSource).toContain('<BorderBeam');
    });

    it('uses CatchCard for the CWE-driven vulnerability showcase (replaces Marquee in 2026-05 diet)', () => {
      expect(homepageSource).toContain('<CatchCard');
    });
  });
});

// ============================================================
// LAYOUT_PHILOSOPHY.md adherence lock
// ----------------------------------------------------------------
// The philosophy at /LAYOUT_PHILOSOPHY.md mandates four primitives —
// <Container>, <Section>, <SectionHeader>, <Stack>. Open-coding section
// wrappers is forbidden; the homepage was the canonical drift, tracked in
// apps/docs/HOMEPAGE_LAYOUT_AUDIT.md. After the 2026-05-10 refactor, the
// home composes only those primitives. This block guards against
// regression.
// ============================================================

// ============================================================
// R19 — no raw color literals in JSX attributes
// ----------------------------------------------------------------
// The `react-features/component-api/no-raw-color-literal` rule forbids
// hex / rgb / hsl / oklch strings inside JSX attribute values on this
// surface — colors must come from CSS tokens (`var(--cta-*)` etc.)
// defined in `apps/docs/src/app/global.css`. The lint rule catches new
// drift; this lock catches re-introductions during refactors that
// might run before lint (and is faster to read in a PR review).
// ============================================================

describe('Homepage: no raw color literals in JSX attributes (R19)', () => {
  const homepagePath = join(process.cwd(), 'src/app/(home)/page.tsx');
  const heroPath = join(process.cwd(), 'src/components/home/hero-section.tsx');
  let homepageSource: string;
  let heroSource: string;

  beforeAll(() => {
    homepageSource = readFileSync(homepagePath, 'utf-8');
    heroSource = readFileSync(heroPath, 'utf-8');
  });

  // The rule pattern is `JSXAttribute > Literal` with the value matching
  // `/(#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\s*\()/`. The lock
  // mirrors that — any JSX attribute (`name="…"` or `name={"…"}`) whose
  // string value contains a hex/rgb/hsl/oklch color is forbidden.
  const RAW_COLOR_IN_JSX_ATTR =
    /=\s*\{?\s*"[^"]*(?:#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\s*\()/;

  it('homepage page.tsx contains NO raw hex/rgb/hsl/oklch literals in JSX attributes', () => {
    expect(homepageSource).not.toMatch(RAW_COLOR_IN_JSX_ATTR);
  });

  it('hero-section.tsx contains NO raw hex/rgb/hsl/oklch literals in JSX attributes', () => {
    // The hero owns two ShimmerButton CTAs (primary + secondary GitHub).
    // Both used to inline `#c084fc` / `#6d28d9` / `rgba(255,255,255,0.12)`;
    // they now read from `var(--cta-*)` in global.css. If this assertion
    // fails the migration regressed — restore the var(...) refs.
    expect(heroSource).not.toMatch(RAW_COLOR_IN_JSX_ATTR);
  });

  it('homepage references the CTA tokens (BorderBeam + ShimmerButton flow through global.css)', () => {
    expect(homepageSource).toMatch(/var\(--cta-beam-(?:from|to)\)/);
    expect(homepageSource).toMatch(/var\(--cta-(?:shimmer|bg-gradient)\)/);
  });

  it('hero references the CTA tokens for both primary and secondary CTAs', () => {
    expect(heroSource).toMatch(/var\(--cta-(?:shimmer|bg-gradient)\)/);
    expect(heroSource).toMatch(/var\(--cta-secondary-bg\)/);
  });
});

describe('Homepage: LAYOUT_PHILOSOPHY adherence', () => {
  let homepageSource: string;
  const homepagePath = join(process.cwd(), 'src/app/(home)/page.tsx');

  beforeAll(() => {
    homepageSource = readFileSync(homepagePath, 'utf-8');
  });

  describe('Required imports', () => {
    it('imports Section from @interlace/ui (open-coded <section> wrappers are forbidden)', () => {
      expect(homepageSource).toContain(
        "import { Section } from '@interlace/ui/section'",
      );
    });

    it('imports SectionHeader from @interlace/ui/blocks/section-header', () => {
      expect(homepageSource).toContain(
        "import { SectionHeader } from '@interlace/ui/blocks/section-header'",
      );
    });
  });

  describe('Forbidden patterns (LAYOUT_PHILOSOPHY.md §1, §2, §3, §5, §8)', () => {
    it('does NOT open-code `container mx-auto px-*` in className strings (§1 — Section owns the wrapper)', () => {
      // Match inside JSX className strings only — comment prose explaining
      // the philosophy is allowed (and present in the page header).
      expect(homepageSource).not.toMatch(
        /className=["'`][^"'`]*\bcontainer\s+mx-auto\b/,
      );
    });

    it('does NOT use ad-hoc `max-w-3xl/4xl/5xl/6xl/7xl` widths in className strings (§2 — Container size is a contract)', () => {
      expect(homepageSource).not.toMatch(
        /className=["'`][^"'`]*\bmax-w-(3xl|4xl|5xl|6xl|7xl)\b/,
      );
    });

    it('does NOT open-code a bare `<section className="container ...">` wrapper (§1, §7)', () => {
      expect(homepageSource).not.toMatch(/<section\s+className="container\b/);
    });

    it('does NOT use inline `border-y border-fd-border` on the section wrappers (§8 — divider prop owns it)', () => {
      // After the refactor, dividers are owned by <Section divider="…">.
      // The only borders left in the file should be card / pillar internals.
      // Bare `<section …border-y border-fd-border` is what the philosophy forbids.
      expect(homepageSource).not.toMatch(
        /<section[^>]*border-y\s+border-fd-border/,
      );
      expect(homepageSource).not.toMatch(
        /<section[^>]*border-t\s+border-fd-border/,
      );
    });

    it('does NOT inline `bg-fd-card/30|50` on the section wrappers (§8 — tone prop owns it)', () => {
      expect(homepageSource).not.toMatch(/<section[^>]*bg-fd-card\//);
    });
  });

  describe('Sections are composed (not open-coded)', () => {
    it('uses <Section …> for every page-level section block', () => {
      const sectionPrimitive = (homepageSource.match(/<Section\b/g) ?? [])
        .length;
      // Hero is full-bleed and out of scope (LAYOUT_AUDIT.md). The remaining
      // sections — stats / preview / catches / social / pillars / how-it-works
      // / edges / final-CTA — should all be <Section>.
      expect(sectionPrimitive).toBeGreaterThanOrEqual(8);
    });

    it('uses <SectionHeader …> for the repeated headline blocks (replaces 6 hand-coded copies)', () => {
      const headers = (homepageSource.match(/<SectionHeader\b/g) ?? []).length;
      expect(headers).toBeGreaterThanOrEqual(5);
    });
  });
});
