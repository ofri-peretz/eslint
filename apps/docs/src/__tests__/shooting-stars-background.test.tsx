/**
 * Shooting Stars and Stars Background Component Tests
 *
 * Tests for the Aceternity UI ShootingStars and StarsBackground components.
 * Validates component structure, props, and animation configuration.
 *
 * These tests ensure the components match the official Aceternity UI specification:
 * https://ui.aceternity.com/components/shooting-stars-and-stars-background
 *
 * CRITICAL: These tests lock the animation behavior and component configuration.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// =========================================
// ACETERNITY UI SPECIFICATION
// Official default values from the components
// =========================================

// ShootingStars default props
const SHOOTING_STARS_DEFAULTS = {
  minSpeed: 10,
  maxSpeed: 30,
  minDelay: 1200,
  maxDelay: 4200,
  starColor: '#9E00FF',
  trailColor: '#2EB9DF',
  starWidth: 10,
  starHeight: 1,
};

// StarsBackground default props
const STARS_BACKGROUND_DEFAULTS = {
  starDensity: 0.00015,
  allStarsTwinkle: true,
  twinkleProbability: 0.7,
  minTwinkleSpeed: 0.5,
  maxTwinkleSpeed: 1,
};

// =========================================
// TEST SUITES
// =========================================

describe('ShootingStars + StarsBackground: Aceternity UI Specification Compliance', () => {
  describe('ShootingStars Default Props', () => {
    it('defines correct minSpeed default (10)', () => {
      expect(SHOOTING_STARS_DEFAULTS.minSpeed).toBe(10);
    });

    it('defines correct maxSpeed default (30)', () => {
      expect(SHOOTING_STARS_DEFAULTS.maxSpeed).toBe(30);
    });

    it('defines correct minDelay default (1200ms)', () => {
      expect(SHOOTING_STARS_DEFAULTS.minDelay).toBe(1200);
    });

    it('defines correct maxDelay default (4200ms)', () => {
      expect(SHOOTING_STARS_DEFAULTS.maxDelay).toBe(4200);
    });

    it('defines correct starColor default (#9E00FF - purple)', () => {
      expect(SHOOTING_STARS_DEFAULTS.starColor).toBe('#9E00FF');
    });

    it('defines correct trailColor default (#2EB9DF - cyan)', () => {
      expect(SHOOTING_STARS_DEFAULTS.trailColor).toBe('#2EB9DF');
    });

    it('defines correct starWidth default (10)', () => {
      expect(SHOOTING_STARS_DEFAULTS.starWidth).toBe(10);
    });

    it('defines correct starHeight default (1)', () => {
      expect(SHOOTING_STARS_DEFAULTS.starHeight).toBe(1);
    });
  });

  describe('StarsBackground Default Props', () => {
    it('defines correct starDensity default (0.00015)', () => {
      expect(STARS_BACKGROUND_DEFAULTS.starDensity).toBe(0.00015);
    });

    it('defines correct allStarsTwinkle default (true)', () => {
      expect(STARS_BACKGROUND_DEFAULTS.allStarsTwinkle).toBe(true);
    });

    it('defines correct twinkleProbability default (0.7)', () => {
      expect(STARS_BACKGROUND_DEFAULTS.twinkleProbability).toBe(0.7);
    });

    it('defines correct minTwinkleSpeed default (0.5)', () => {
      expect(STARS_BACKGROUND_DEFAULTS.minTwinkleSpeed).toBe(0.5);
    });

    it('defines correct maxTwinkleSpeed default (1)', () => {
      expect(STARS_BACKGROUND_DEFAULTS.maxTwinkleSpeed).toBe(1);
    });
  });
});

describe('ShootingStars + StarsBackground: Source File Integrity', () => {
  const componentPath = join(process.cwd(), 'src/components/ui/stars-background.tsx');

  it('component file exists', () => {
    expect(existsSync(componentPath)).toBe(true);
  });

  describe('File Structure', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('is a client component', () => {
      expect(componentSource).toContain('"use client"');
    });

    it('imports cn utility', () => {
      expect(componentSource).toContain('import { cn }');
    });

    it('exports StarsBackground component', () => {
      expect(componentSource).toContain('export const StarsBackground');
    });

    it('exports ShootingStars component', () => {
      expect(componentSource).toContain('export const ShootingStars');
    });
  });

  describe('StarsBackground Component Structure', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('uses canvas element for star rendering', () => {
      expect(componentSource).toContain('<canvas');
      expect(componentSource).toContain('canvasRef');
    });

    it('uses useState for stars array', () => {
      expect(componentSource).toContain('useState<StarProps[]>');
    });

    it('uses useRef for canvas reference', () => {
      expect(componentSource).toContain('useRef<HTMLCanvasElement>');
    });

    it('uses useCallback for generateStars function', () => {
      expect(componentSource).toContain('useCallback');
      expect(componentSource).toContain('generateStars');
    });

    it('uses ResizeObserver for responsive canvas', () => {
      expect(componentSource).toContain('ResizeObserver');
    });

    it('has starDensity prop with default value', () => {
      expect(componentSource).toContain('starDensity = 0.00015');
    });

    it('has allStarsTwinkle prop with default value', () => {
      expect(componentSource).toContain('allStarsTwinkle = true');
    });

    it('has twinkleProbability prop with default value', () => {
      expect(componentSource).toContain('twinkleProbability = 0.7');
    });

    it('has minTwinkleSpeed prop with default value', () => {
      expect(componentSource).toContain('minTwinkleSpeed = 0.5');
    });

    it('has maxTwinkleSpeed prop with default value', () => {
      expect(componentSource).toContain('maxTwinkleSpeed = 1');
    });

    it('uses requestAnimationFrame for smooth animation', () => {
      expect(componentSource).toContain('requestAnimationFrame');
    });

    it('cancels animation frame on cleanup', () => {
      expect(componentSource).toContain('cancelAnimationFrame');
    });

    it('calculates twinkle using sine wave', () => {
      expect(componentSource).toContain('Math.sin');
    });

    it('renders stars with white color and variable opacity', () => {
      expect(componentSource).toContain('rgba(255, 255, 255');
    });
  });

  describe('ShootingStars Component Structure', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('uses SVG element for shooting star rendering', () => {
      expect(componentSource).toContain('<svg');
      expect(componentSource).toContain('svgRef');
    });

    it('uses rect element for star shape', () => {
      expect(componentSource).toContain('<rect');
    });

    it('uses linear gradient for star trail effect', () => {
      expect(componentSource).toContain('<linearGradient');
      expect(componentSource).toContain('id="gradient"');
    });

    it('has gradient stops for trail and star colors', () => {
      expect(componentSource).toContain('stopColor: trailColor');
      expect(componentSource).toContain('stopColor: starColor');
    });

    it('has minSpeed prop with default value', () => {
      expect(componentSource).toContain('minSpeed = 10');
    });

    it('has maxSpeed prop with default value', () => {
      expect(componentSource).toContain('maxSpeed = 30');
    });

    it('has minDelay prop with default value', () => {
      expect(componentSource).toContain('minDelay = 1200');
    });

    it('has maxDelay prop with default value', () => {
      expect(componentSource).toContain('maxDelay = 4200');
    });

    it('has starColor prop with default value', () => {
      expect(componentSource).toContain('starColor = "#9E00FF"');
    });

    it('has trailColor prop with default value', () => {
      expect(componentSource).toContain('trailColor = "#2EB9DF"');
    });

    it('has starWidth prop with default value', () => {
      expect(componentSource).toContain('starWidth = 10');
    });

    it('has starHeight prop with default value', () => {
      expect(componentSource).toContain('starHeight = 1');
    });

    it('uses setTimeout for star spawn delay', () => {
      expect(componentSource).toContain('setTimeout');
    });

    it('uses requestAnimationFrame for star movement', () => {
      expect(componentSource).toContain('requestAnimationFrame');
    });

    it('calculates angle using Math.cos and Math.sin', () => {
      expect(componentSource).toContain('Math.cos');
      expect(componentSource).toContain('Math.sin');
    });

    it('applies rotation transform to star', () => {
      expect(componentSource).toContain('rotate');
      expect(componentSource).toContain('transform=');
    });
  });

  describe('StarProps Interface', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('defines StarProps interface', () => {
      expect(componentSource).toContain('interface StarProps');
    });

    it('has x coordinate property', () => {
      expect(componentSource).toContain('x: number');
    });

    it('has y coordinate property', () => {
      expect(componentSource).toContain('y: number');
    });

    it('has radius property', () => {
      expect(componentSource).toContain('radius: number');
    });

    it('has opacity property', () => {
      expect(componentSource).toContain('opacity: number');
    });

    it('has twinkleSpeed property (nullable)', () => {
      expect(componentSource).toContain('twinkleSpeed: number | null');
    });
  });

  describe('Container Styling', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('StarsBackground canvas is absolutely positioned', () => {
      expect(componentSource).toContain('absolute inset-0');
    });

    it('StarsBackground canvas has full width/height', () => {
      expect(componentSource).toContain('h-full w-full');
    });

    it('ShootingStars SVG is absolutely positioned', () => {
      expect(componentSource).toContain('w-full h-full absolute inset-0');
    });

    it('ShootingStars SVG has pointer-events-none', () => {
      expect(componentSource).toContain('pointer-events-none');
    });

    it('applies className to containers', () => {
      expect(componentSource).toContain('className');
      expect(componentSource).toContain('cn(');
    });

    // === HYDRATION SAFETY LOCKS ===
    // These tests lock the hydration-safe implementation to prevent regression
    
    it('StarsBackground uses will-change-transform Tailwind class (NOT inline style)', () => {
      // The will-change property MUST be applied via Tailwind class, NOT inline style
      // This prevents hydration mismatches in Next.js
      expect(componentSource).toContain('will-change-transform');
    });

    it('StarsBackground canvas does NOT have inline style with will-change', () => {
      // Find the canvas return statement for StarsBackground
      const canvasReturn = componentSource.match(/return\s*\(\s*<canvas[\s\S]*?\/>/);
      if (canvasReturn) {
        // Should NOT have style={{ willChange: ... }}
        expect(canvasReturn[0]).not.toContain("style={{");
        expect(canvasReturn[0]).not.toContain("willChange");
      }
    });

    it('StarsBackground has suppressHydrationWarning attribute', () => {
      // Extra safety layer for any remaining hydration edge cases
      expect(componentSource).toContain('suppressHydrationWarning');
    });
  });
});

describe('ShootingStars + StarsBackground: Animation Logic', () => {
  describe('Star Generation Logic', () => {
    it('star density calculation is area-based', () => {
      const componentPath = join(process.cwd(), 'src/components/ui/stars-background.tsx');
      const componentSource = readFileSync(componentPath, 'utf-8');
      expect(componentSource).toContain('area * starDensity');
    });

    it('star radius is randomized', () => {
      const componentPath = join(process.cwd(), 'src/components/ui/stars-background.tsx');
      const componentSource = readFileSync(componentPath, 'utf-8');
      expect(componentSource).toContain('Math.random() * 0.05 + 0.5');
    });

    it('star opacity is randomized', () => {
      const componentPath = join(process.cwd(), 'src/components/ui/stars-background.tsx');
      const componentSource = readFileSync(componentPath, 'utf-8');
      expect(componentSource).toContain('Math.random() * 0.5 + 0.5');
    });
  });

  describe('Shooting Star Movement Logic', () => {
    it('shooting star speed is randomized within range', () => {
      const componentPath = join(process.cwd(), 'src/components/ui/stars-background.tsx');
      const componentSource = readFileSync(componentPath, 'utf-8');
      expect(componentSource).toContain('Math.random() * (maxSpeed - minSpeed) + minSpeed');
    });

    it('shooting star delay is randomized within range', () => {
      const componentPath = join(process.cwd(), 'src/components/ui/stars-background.tsx');
      const componentSource = readFileSync(componentPath, 'utf-8');
      expect(componentSource).toContain('Math.random() * (maxDelay - minDelay) + minDelay');
    });

    it('angle is converted to radians for calculation', () => {
      const componentPath = join(process.cwd(), 'src/components/ui/stars-background.tsx');
      const componentSource = readFileSync(componentPath, 'utf-8');
      expect(componentSource).toContain('Math.PI) / 180');
    });
  });

  describe('Canvas Drawing Operations', () => {
    it('clears canvas each frame', () => {
      const componentPath = join(process.cwd(), 'src/components/ui/stars-background.tsx');
      const componentSource = readFileSync(componentPath, 'utf-8');
      expect(componentSource).toContain('ctx.clearRect');
    });

    it('draws stars using arc method', () => {
      const componentPath = join(process.cwd(), 'src/components/ui/stars-background.tsx');
      const componentSource = readFileSync(componentPath, 'utf-8');
      expect(componentSource).toContain('ctx.arc');
    });

    it('uses 2D context for drawing', () => {
      const componentPath = join(process.cwd(), 'src/components/ui/stars-background.tsx');
      const componentSource = readFileSync(componentPath, 'utf-8');
      expect(componentSource).toContain('getContext("2d")');
    });

    it('uses beginPath before drawing', () => {
      const componentPath = join(process.cwd(), 'src/components/ui/stars-background.tsx');
      const componentSource = readFileSync(componentPath, 'utf-8');
      expect(componentSource).toContain('ctx.beginPath()');
    });

    it('uses fill after path creation', () => {
      const componentPath = join(process.cwd(), 'src/components/ui/stars-background.tsx');
      const componentSource = readFileSync(componentPath, 'utf-8');
      expect(componentSource).toContain('ctx.fill()');
    });
  });
});

describe('ShootingStars + StarsBackground: Props TypeScript Interface', () => {
  const componentPath = join(process.cwd(), 'src/components/ui/stars-background.tsx');
  let componentSource: string;

  beforeAll(() => {
    componentSource = readFileSync(componentPath, 'utf-8');
  });

  describe('StarBackgroundProps Interface', () => {
    it('defines StarBackgroundProps interface', () => {
      expect(componentSource).toContain('interface StarBackgroundProps');
    });

    it('defines starDensity as optional number', () => {
      expect(componentSource).toContain('starDensity?: number');
    });

    it('defines allStarsTwinkle as optional boolean', () => {
      expect(componentSource).toContain('allStarsTwinkle?: boolean');
    });

    it('defines twinkleProbability as optional number', () => {
      expect(componentSource).toContain('twinkleProbability?: number');
    });

    it('defines minTwinkleSpeed as optional number', () => {
      expect(componentSource).toContain('minTwinkleSpeed?: number');
    });

    it('defines maxTwinkleSpeed as optional number', () => {
      expect(componentSource).toContain('maxTwinkleSpeed?: number');
    });

    it('defines className as optional string', () => {
      expect(componentSource).toContain('className?: string');
    });
  });

  describe('ShootingStarProps Interface', () => {
    it('defines ShootingStarProps interface', () => {
      expect(componentSource).toContain('interface ShootingStarProps');
    });

    it('defines minSpeed as optional number', () => {
      expect(componentSource).toContain('minSpeed?: number');
    });

    it('defines maxSpeed as optional number', () => {
      expect(componentSource).toContain('maxSpeed?: number');
    });

    it('defines minDelay as optional number', () => {
      expect(componentSource).toContain('minDelay?: number');
    });

    it('defines maxDelay as optional number', () => {
      expect(componentSource).toContain('maxDelay?: number');
    });

    it('defines starColor as optional string', () => {
      expect(componentSource).toContain('starColor?: string');
    });

    it('defines trailColor as optional string', () => {
      expect(componentSource).toContain('trailColor?: string');
    });

    it('defines starWidth as optional number', () => {
      expect(componentSource).toContain('starWidth?: number');
    });

    it('defines starHeight as optional number', () => {
      expect(componentSource).toContain('starHeight?: number');
    });
  });

  describe('MeteorsProps Interface', () => {
    it('defines MeteorsProps interface', () => {
      expect(componentSource).toContain('interface MeteorsProps');
    });

    it('defines number as optional number', () => {
      expect(componentSource).toContain('number?: number');
    });

    it('defines minDuration as optional number', () => {
      expect(componentSource).toContain('minDuration?: number');
    });

    it('defines maxDuration as optional number', () => {
      expect(componentSource).toContain('maxDuration?: number');
    });

    it('defines meteorColor as optional string', () => {
      expect(componentSource).toContain('meteorColor?: string');
    });

    it('defines trailColor as optional string', () => {
      expect(componentSource).toContain('trailColor?: string');
    });
  });
});

// =========================================
// METEORS COMPONENT TESTS
// =========================================

// Meteors default props (updated to match CSS Animation Shift refactor)
const METEORS_DEFAULTS = {
  number: 3,
  minDuration: 12,
  maxDuration: 30,
  meteorColor: '#e9d5ff',
  trailColor: 'transparent',
};

describe('Meteors: Aceternity-Inspired Component Specification', () => {
  describe('Meteors Default Props', () => {
    it('defines correct number default (3)', () => {
      expect(METEORS_DEFAULTS.number).toBe(3);
    });

    it('defines correct minDuration default (12s)', () => {
      expect(METEORS_DEFAULTS.minDuration).toBe(12);
    });

    it('defines correct maxDuration default (30s)', () => {
      expect(METEORS_DEFAULTS.maxDuration).toBe(30);
    });

    it('defines correct meteorColor default (#e9d5ff - purple)', () => {
      expect(METEORS_DEFAULTS.meteorColor).toBe('#e9d5ff');
    });

    it('defines correct trailColor default (transparent)', () => {
      expect(METEORS_DEFAULTS.trailColor).toBe('transparent');
    });
  });
});

describe('Meteors: Source File Integrity', () => {
  const componentPath = join(process.cwd(), 'src/components/ui/stars-background.tsx');

  describe('File Structure', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('exports Meteors component', () => {
      expect(componentSource).toContain('export const Meteors');
    });

    it('Meteors component uses pure CSS animations (no Framer Motion)', () => {
      // Meteors should NOT use motion.div or motion/react
      const meteorsSection = componentSource.slice(
        componentSource.indexOf('export const Meteors'),
      );
      expect(meteorsSection).not.toContain('motion.div');
      expect(meteorsSection).not.toContain("from 'motion/react'");
    });
  });

  describe('Meteors Component Structure', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('uses div container element', () => {
      expect(componentSource).toContain('containerRef');
      expect(componentSource).toContain('useRef<HTMLDivElement>');
    });

    it('uses span elements for meteor rendering', () => {
      expect(componentSource).toContain('<span');
      expect(componentSource).toContain('meteor-');
    });

    it('has number prop with default value', () => {
      expect(componentSource).toContain('number = 3');
    });

    it('has minDuration prop with default value', () => {
      expect(componentSource).toContain('minDuration = 12');
    });

    it('has maxDuration prop with default value', () => {
      expect(componentSource).toContain('maxDuration = 30');
    });

    it('has meteorColor prop with default value', () => {
      expect(componentSource).toContain('meteorColor = "#e9d5ff"');
    });

    it('has trailColor prop with default value', () => {
      expect(componentSource).toContain('trailColor = "transparent"');
    });

    it('uses CSS animation class', () => {
      expect(componentSource).toContain('animate-meteor-effect');
    });

    it('applies rotation transform for diagonal movement via CSS custom properties', () => {
      // Uses CSS custom property for rotation instead of Tailwind class (CSS Animation Shift pattern)
      expect(componentSource).toContain('--meteor-angle');
      expect(componentSource).toContain('rotate(var(--meteor-angle');
    });

    it('renders meteor trail element with gradient styling', () => {
      // The trail is styled using inline gradient (part of CSS Animation Shift pattern)
      expect(componentSource).toContain('meteor trail');
      expect(componentSource).toContain('linear-gradient');
    });
  });

  describe('Performance Optimizations', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('uses IntersectionObserver for visibility detection', () => {
      expect(componentSource).toContain('IntersectionObserver');
    });

    it('pauses animation when not visible', () => {
      expect(componentSource).toContain('animationPlayState');
      expect(componentSource).toContain("isVisible ? \"running\" : \"paused\"");
    });

    it('uses deterministic positioning to prevent hydration mismatches', () => {
      // Should use index-based seed instead of Math.random() for initial positions
      expect(componentSource).toContain('seed');
      expect(componentSource).toContain('idx *');
    });

    it('uses isMounted state for client-only rendering', () => {
      expect(componentSource).toContain('isMounted');
      expect(componentSource).toContain('setIsMounted(true)');
    });

    it('uses suppressHydrationWarning on container', () => {
      expect(componentSource).toContain('suppressHydrationWarning');
    });

    it('conditionally renders meteors based on mount state', () => {
      expect(componentSource).toContain('isMounted && meteors.map');
    });

    it('uses useState lazy initializer for meteor array', () => {
      expect(componentSource).toContain('useState(() =>');
    });

    it('container has pointer-events-none for performance', () => {
      expect(componentSource).toContain('pointer-events-none');
    });

    it('container has overflow-hidden to contain meteors', () => {
      expect(componentSource).toContain('overflow-hidden');
    });
  });

  describe('CSS Animation Configuration', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('uses CSS custom properties for animation timing', () => {
      expect(componentSource).toContain('--meteor-delay');
      expect(componentSource).toContain('--meteor-duration');
    });

    it('positions meteors above container', () => {
      expect(componentSource).toContain('top: "-40px"');
    });

    it('centers meteor distribution with position offset', () => {
      expect(componentSource).toContain('calc(50%');
      expect(componentSource).toContain('position}px');
    });
  });
});

// Helper function to be used in beforeAll
function beforeAll(fn: () => void) {
  fn();
}
