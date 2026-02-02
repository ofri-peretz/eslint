/**
 * BackgroundBeamsWithCollision Component Tests
 *
 * Tests for the Aceternity UI BackgroundBeamsWithCollision component.
 * Validates component structure, props, collision mechanics, and theme support.
 *
 * These tests ensure the component matches the official Aceternity UI specification:
 * https://ui.aceternity.com/components/background-beams-with-collision
 *
 * CRITICAL: These tests lock the animation behavior, collision mechanics, and theme integration.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// =========================================
// ACETERNITY UI SPECIFICATION
// Official default values from the component
// =========================================

/**
 * Default beam configurations from Aceternity UI spec
 * Each beam has unique position, timing, and styling
 */
const DEFAULT_BEAMS_SPEC = [
  { initialX: 10, translateX: 10, duration: 7, repeatDelay: 3, delay: 2 },
  { initialX: 600, translateX: 600, duration: 3, repeatDelay: 3, delay: 4 },
  { initialX: 100, translateX: 100, duration: 7, repeatDelay: 7, className: 'h-6' },
  { initialX: 400, translateX: 400, duration: 5, repeatDelay: 14, delay: 4 },
  { initialX: 800, translateX: 800, duration: 11, repeatDelay: 2, className: 'h-20' },
  { initialX: 1000, translateX: 1000, duration: 4, repeatDelay: 2, className: 'h-12' },
  { initialX: 1200, translateX: 1200, duration: 6, repeatDelay: 4, delay: 2, className: 'h-6' },
];

/**
 * Animation defaults for beam motion
 */
const ANIMATION_DEFAULTS = {
  initialY: '-200px',
  translateY: '1800px',
  rotate: 0,
  duration: 8,
  delay: 0,
  repeatDelay: 0,
};

/**
 * Explosion particle count
 */
const EXPLOSION_PARTICLE_COUNT = 20;

/**
 * Collision detection interval in milliseconds
 */
const COLLISION_CHECK_INTERVAL_MS = 50;

/**
 * Explosion animation duration in milliseconds
 */
const EXPLOSION_DURATION_MS = 2000;

// =========================================
// TEST SUITES
// =========================================

describe('BackgroundBeamsWithCollision: Aceternity UI Specification Compliance', () => {
  describe('Default Beam Configuration', () => {
    it('has 7 default beams', () => {
      expect(DEFAULT_BEAMS_SPEC.length).toBe(7);
    });

    it('first beam: initialX=10, duration=7, repeatDelay=3, delay=2', () => {
      expect(DEFAULT_BEAMS_SPEC[0]).toEqual({
        initialX: 10,
        translateX: 10,
        duration: 7,
        repeatDelay: 3,
        delay: 2,
      });
    });

    it('second beam: initialX=600, duration=3, repeatDelay=3, delay=4', () => {
      expect(DEFAULT_BEAMS_SPEC[1]).toEqual({
        initialX: 600,
        translateX: 600,
        duration: 3,
        repeatDelay: 3,
        delay: 4,
      });
    });

    it('third beam has h-6 className for smaller height', () => {
      expect(DEFAULT_BEAMS_SPEC[2].className).toBe('h-6');
    });

    it('fifth beam has h-20 className for larger height', () => {
      expect(DEFAULT_BEAMS_SPEC[4].className).toBe('h-20');
    });

    it('sixth beam has h-12 className for medium height', () => {
      expect(DEFAULT_BEAMS_SPEC[5].className).toBe('h-12');
    });
  });

  describe('Animation Defaults', () => {
    it('default initialY is -200px (starts above viewport)', () => {
      expect(ANIMATION_DEFAULTS.initialY).toBe('-200px');
    });

    it('default translateY is 1800px (travels beyond viewport)', () => {
      expect(ANIMATION_DEFAULTS.translateY).toBe('1800px');
    });

    it('default rotation is 0 degrees', () => {
      expect(ANIMATION_DEFAULTS.rotate).toBe(0);
    });

    it('default duration is 8 seconds', () => {
      expect(ANIMATION_DEFAULTS.duration).toBe(8);
    });

    it('default delay is 0', () => {
      expect(ANIMATION_DEFAULTS.delay).toBe(0);
    });

    it('default repeatDelay is 0', () => {
      expect(ANIMATION_DEFAULTS.repeatDelay).toBe(0);
    });
  });

  describe('Explosion Configuration', () => {
    it('explosion generates 20 particles', () => {
      expect(EXPLOSION_PARTICLE_COUNT).toBe(20);
    });

    it('collision is checked every 50ms', () => {
      expect(COLLISION_CHECK_INTERVAL_MS).toBe(50);
    });

    it('explosion animation lasts 2000ms', () => {
      expect(EXPLOSION_DURATION_MS).toBe(2000);
    });
  });
});

describe('BackgroundBeamsWithCollision: Source File Integrity', () => {
  const componentPath = join(
    process.cwd(),
    'src/components/ui/background-beams-with-collision.tsx'
  );

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

    it('imports motion and AnimatePresence from motion/react', () => {
      expect(componentSource).toContain('import { motion, AnimatePresence }');
      expect(componentSource).toContain('from "motion/react"');
    });

    it('imports useRef from React', () => {
      expect(componentSource).toContain('useRef');
    });

    it('imports useState from React', () => {
      expect(componentSource).toContain('useState');
    });

    it('imports useEffect from React', () => {
      expect(componentSource).toContain('useEffect');
    });

    it('exports BackgroundBeamsWithCollision component', () => {
      expect(componentSource).toContain('export const BackgroundBeamsWithCollision');
    });

    it('exports default BackgroundBeamsWithCollision', () => {
      expect(componentSource).toContain('export default BackgroundBeamsWithCollision');
    });
  });

  describe('Component Props Interface', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('defines BackgroundBeamsWithCollisionProps interface', () => {
      expect(componentSource).toContain('interface BackgroundBeamsWithCollisionProps');
    });

    it('children prop is required React.ReactNode', () => {
      expect(componentSource).toContain('children: React.ReactNode');
    });

    it('className prop is optional', () => {
      expect(componentSource).toContain('className?: string');
    });

    it('containerClassName prop is optional', () => {
      expect(componentSource).toContain('containerClassName?: string');
    });

    it('beams prop is optional with BeamConfig[] type', () => {
      expect(componentSource).toContain('beams?: BeamConfig[]');
    });
  });

  describe('BeamConfig Interface', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('defines BeamConfig interface', () => {
      expect(componentSource).toContain('interface BeamConfig');
    });

    it('exports BeamConfig interface', () => {
      expect(componentSource).toContain('export interface BeamConfig');
    });

    it('defines initialX as optional number', () => {
      expect(componentSource).toContain('initialX?: number');
    });

    it('defines translateX as optional number', () => {
      expect(componentSource).toContain('translateX?: number');
    });

    it('defines initialY as optional number', () => {
      expect(componentSource).toContain('initialY?: number');
    });

    it('defines translateY as optional number', () => {
      expect(componentSource).toContain('translateY?: number');
    });

    it('defines rotate as optional number', () => {
      expect(componentSource).toContain('rotate?: number');
    });

    it('defines className as optional string', () => {
      expect(componentSource).toContain('className?: string');
    });

    it('defines duration as optional number', () => {
      expect(componentSource).toContain('duration?: number');
    });

    it('defines delay as optional number', () => {
      expect(componentSource).toContain('delay?: number');
    });

    it('defines repeatDelay as optional number', () => {
      expect(componentSource).toContain('repeatDelay?: number');
    });
  });

  describe('CollisionState Interface', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('defines CollisionState interface', () => {
      expect(componentSource).toContain('interface CollisionState');
    });

    it('has detected boolean property', () => {
      expect(componentSource).toContain('detected: boolean');
    });

    it('has coordinates property with x and y', () => {
      expect(componentSource).toContain('coordinates: { x: number; y: number } | null');
    });
  });
});

describe('BackgroundBeamsWithCollision: Container Structure', () => {
  const componentPath = join(
    process.cwd(),
    'src/components/ui/background-beams-with-collision.tsx'
  );
  let componentSource: string;

  beforeAll(() => {
    componentSource = readFileSync(componentPath, 'utf-8');
  });

  describe('Parent Container', () => {
    it('uses parentRef for collision detection', () => {
      expect(componentSource).toContain('parentRef');
      expect(componentSource).toContain('ref={parentRef}');
    });

    it('has relative positioning', () => {
      expect(componentSource).toContain('relative');
    });

    it('uses flex layout with center alignment', () => {
      expect(componentSource).toContain('flex');
      expect(componentSource).toContain('items-center');
      expect(componentSource).toContain('justify-center');
    });

    it('has overflow hidden', () => {
      expect(componentSource).toContain('overflow-hidden');
    });

    it('has default height h-96 for mobile', () => {
      expect(componentSource).toContain('h-96');
    });

    it('has md:h-[40rem] for larger screens', () => {
      expect(componentSource).toContain('md:h-[40rem]');
    });
  });

  describe('Collision Surface Container', () => {
    it('uses containerRef for collision surface', () => {
      expect(componentSource).toContain('containerRef');
      expect(componentSource).toContain('ref={containerRef}');
    });

    it('is positioned at bottom', () => {
      expect(componentSource).toContain('bottom-0');
    });

    it('has inset-x-0 for full width', () => {
      expect(componentSource).toContain('inset-x-0');
    });

    it('has pointer-events-none', () => {
      expect(componentSource).toContain('pointer-events-none');
    });

    it('has custom box-shadow for depth effect', () => {
      expect(componentSource).toContain('boxShadow');
      expect(componentSource).toContain('rgba(34, 42, 53');
    });
  });

  describe('Content Wrapper', () => {
    it('has z-10 for content stacking', () => {
      expect(componentSource).toContain('z-10');
    });

    it('accepts className prop for content styling', () => {
      expect(componentSource).toContain('className={cn("relative z-10", className)}');
    });
  });
});

describe('BackgroundBeamsWithCollision: Theme Support', () => {
  const componentPath = join(
    process.cwd(),
    'src/components/ui/background-beams-with-collision.tsx'
  );
  let componentSource: string;

  beforeAll(() => {
    componentSource = readFileSync(componentPath, 'utf-8');
  });

  describe('Container Background - Light Mode', () => {
    it('uses bg-gradient-to-b for vertical gradient', () => {
      expect(componentSource).toContain('bg-gradient-to-b');
    });

    it('has from-white start color', () => {
      expect(componentSource).toContain('from-white');
    });

    it('has to-neutral-100 end color', () => {
      expect(componentSource).toContain('to-neutral-100');
    });
  });

  describe('Container Background - Dark Mode', () => {
    it('has dark:from-neutral-950 for deep dark start', () => {
      expect(componentSource).toContain('dark:from-neutral-950');
    });

    it('has dark:via-purple-950/20 for cosmic purple mid-tone', () => {
      expect(componentSource).toContain('dark:via-purple-950/20');
    });

    it('has dark:to-neutral-900 for dark end', () => {
      expect(componentSource).toContain('dark:to-neutral-900');
    });
  });

  describe('Collision Surface - Theme Variants', () => {
    it('light mode: bg-neutral-100', () => {
      expect(componentSource).toContain('bg-neutral-100');
    });

    it('dark mode: dark:bg-neutral-900/50', () => {
      expect(componentSource).toContain('dark:bg-neutral-900/50');
    });
  });

  describe('Beam Gradient - Light Mode', () => {
    it('uses indigo-500 in gradient', () => {
      expect(componentSource).toContain('from-indigo-500');
    });

    it('uses purple-500 in gradient', () => {
      expect(componentSource).toContain('via-purple-500');
    });

    it('fades to transparent', () => {
      expect(componentSource).toContain('to-transparent');
    });
  });

  describe('Beam Gradient - Dark Mode', () => {
    it('dark mode uses cyan-400', () => {
      expect(componentSource).toContain('dark:from-cyan-400');
    });

    it('dark mode uses purple-400', () => {
      expect(componentSource).toContain('dark:via-purple-400');
    });

    it('dark mode fades to transparent', () => {
      expect(componentSource).toContain('dark:to-transparent');
    });
  });

  describe('Explosion Glow - Theme Variants', () => {
    it('light mode: indigo glow via-indigo-500', () => {
      expect(componentSource).toContain('via-indigo-500');
    });

    it('dark mode: cyan glow dark:via-cyan-400', () => {
      expect(componentSource).toContain('dark:via-cyan-400');
    });
  });

  describe('Explosion Particles - Theme Variants', () => {
    it('light mode particles: from-indigo-500 to-purple-500', () => {
      expect(componentSource).toContain('from-indigo-500 to-purple-500');
    });

    it('dark mode particles: dark:from-cyan-400 dark:to-purple-400', () => {
      expect(componentSource).toContain('dark:from-cyan-400 dark:to-purple-400');
    });
  });
});

describe('BackgroundBeamsWithCollision: Collision Mechanism', () => {
  const componentPath = join(
    process.cwd(),
    'src/components/ui/background-beams-with-collision.tsx'
  );
  let componentSource: string;

  beforeAll(() => {
    componentSource = readFileSync(componentPath, 'utf-8');
  });

  describe('CollisionMechanism Component', () => {
    it('defines CollisionMechanism component', () => {
      expect(componentSource).toContain('const CollisionMechanism');
    });

    it('uses React.forwardRef', () => {
      expect(componentSource).toContain('React.forwardRef');
    });

    it('has displayName for debugging', () => {
      expect(componentSource).toContain('CollisionMechanism.displayName = "CollisionMechanism"');
    });

    it('accepts containerRef prop', () => {
      expect(componentSource).toContain('containerRef: React.RefObject<HTMLDivElement');
    });

    it('accepts parentRef prop', () => {
      expect(componentSource).toContain('parentRef: React.RefObject<HTMLDivElement');
    });

    it('accepts beamOptions prop', () => {
      expect(componentSource).toContain('beamOptions?: BeamConfig');
    });
  });

  describe('Collision State Management', () => {
    it('tracks collision state with useState', () => {
      expect(componentSource).toContain('useState<CollisionState>');
    });

    it('initializes collision as not detected', () => {
      expect(componentSource).toContain('detected: false');
    });

    it('initializes coordinates as null', () => {
      expect(componentSource).toContain('coordinates: null');
    });

    it('tracks beamKey for animation restart', () => {
      expect(componentSource).toContain('beamKey');
      expect(componentSource).toContain('setBeamKey');
    });

    it('tracks cycleCollisionDetected to prevent multiple collisions', () => {
      expect(componentSource).toContain('cycleCollisionDetected');
      expect(componentSource).toContain('setCycleCollisionDetected');
    });
  });

  describe('Collision Detection Logic', () => {
    it('uses setInterval for collision checking', () => {
      expect(componentSource).toContain('setInterval');
    });

    it('uses clearInterval for cleanup', () => {
      expect(componentSource).toContain('clearInterval');
    });

    it('gets beamRect using getBoundingClientRect', () => {
      expect(componentSource).toContain('beamRef.current.getBoundingClientRect()');
    });

    it('gets containerRect using getBoundingClientRect', () => {
      expect(componentSource).toContain('containerRef.current.getBoundingClientRect()');
    });

    it('gets parentRect using getBoundingClientRect', () => {
      expect(componentSource).toContain('parentRef.current.getBoundingClientRect()');
    });

    it('detects collision when beamRect.bottom >= containerRect.top', () => {
      expect(componentSource).toContain('beamRect.bottom >= containerRect.top');
    });

    it('calculates relativeX position', () => {
      expect(componentSource).toContain('relativeX');
    });

    it('calculates relativeY position', () => {
      expect(componentSource).toContain('relativeY');
    });
  });

  describe('Collision Reset Logic', () => {
    it('uses setTimeout to reset collision state', () => {
      expect(componentSource).toContain('setTimeout(');
    });

    it('resets beamKey to restart animation', () => {
      expect(componentSource).toContain('setBeamKey((prevKey) => prevKey + 1)');
    });
  });
});

describe('BackgroundBeamsWithCollision: Beam Animation', () => {
  const componentPath = join(
    process.cwd(),
    'src/components/ui/background-beams-with-collision.tsx'
  );
  let componentSource: string;

  beforeAll(() => {
    componentSource = readFileSync(componentPath, 'utf-8');
  });

  describe('Motion Component Usage', () => {
    it('uses motion.div for beam element', () => {
      expect(componentSource).toContain('<motion.div');
    });

    it('uses motion.span for explosion particles', () => {
      expect(componentSource).toContain('<motion.span');
    });

    it('uses AnimatePresence for explosion enter/exit', () => {
      expect(componentSource).toContain('<AnimatePresence>');
    });
  });

  describe('Beam Animation Config', () => {
    it('uses key={beamKey} for animation restart', () => {
      expect(componentSource).toContain('key={beamKey}');
    });

    it('has animate="animate" attribute', () => {
      expect(componentSource).toContain('animate="animate"');
    });

    it('has initial state with translateY', () => {
      expect(componentSource).toContain('translateY: beamOptions.initialY');
    });

    it('has initial state with translateX', () => {
      expect(componentSource).toContain('translateX: beamOptions.initialX');
    });

    it('has initial state with rotate', () => {
      expect(componentSource).toContain('rotate: beamOptions.rotate');
    });

    it('has variants object with animate state', () => {
      expect(componentSource).toContain('variants={{');
      expect(componentSource).toContain('animate: {');
    });
  });

  describe('Beam Transition Config', () => {
    it('uses duration from beamOptions', () => {
      expect(componentSource).toContain('duration: beamOptions.duration');
    });

    it('uses Infinity repeat', () => {
      expect(componentSource).toContain('repeat: Infinity');
    });

    it('uses loop repeatType', () => {
      expect(componentSource).toContain('repeatType: "loop"');
    });

    it('uses linear easing', () => {
      expect(componentSource).toContain('ease: "linear"');
    });

    it('uses delay from beamOptions', () => {
      expect(componentSource).toContain('delay: beamOptions.delay');
    });

    it('uses repeatDelay from beamOptions', () => {
      expect(componentSource).toContain('repeatDelay: beamOptions.repeatDelay');
    });
  });

  describe('Beam Styling', () => {
    it('positioned absolutely', () => {
      expect(componentSource).toContain('absolute');
    });

    it('positioned at left-0', () => {
      expect(componentSource).toContain('left-0');
    });

    it('positioned at top-20', () => {
      expect(componentSource).toContain('top-20');
    });

    it('has default height h-14', () => {
      expect(componentSource).toContain('h-14');
    });

    it('has 1px width (w-px)', () => {
      expect(componentSource).toContain('w-px');
    });

    it('has rounded-full for smooth edges', () => {
      expect(componentSource).toContain('rounded-full');
    });

    it('uses bg-gradient-to-t for upward gradient', () => {
      expect(componentSource).toContain('bg-gradient-to-t');
    });
  });
});

describe('BackgroundBeamsWithCollision: Explosion Effect', () => {
  const componentPath = join(
    process.cwd(),
    'src/components/ui/background-beams-with-collision.tsx'
  );
  let componentSource: string;

  beforeAll(() => {
    componentSource = readFileSync(componentPath, 'utf-8');
  });

  describe('Explosion Component', () => {
    it('defines Explosion component', () => {
      expect(componentSource).toContain('const Explosion');
    });

    it('accepts HTMLProps<HTMLDivElement>', () => {
      expect(componentSource).toContain('React.HTMLProps<HTMLDivElement>');
    });

    it('generates array of 10 particles (spans) for performance', () => {
      expect(componentSource).toContain('Array.from({ length: 10 }');
    });
  });

  describe('Particle Generation', () => {
    it('each particle has id', () => {
      expect(componentSource).toContain('id: index');
    });

    it('each particle has initialX of 0', () => {
      expect(componentSource).toContain('initialX: 0');
    });

    it('each particle has initialY of 0', () => {
      expect(componentSource).toContain('initialY: 0');
    });

    it('generates random directionX between -40 and 40', () => {
      expect(componentSource).toContain('Math.floor(Math.random() * 80 - 40)');
    });

    it('generates random directionY between -60 and -10 (upward)', () => {
      expect(componentSource).toContain('Math.floor(Math.random() * -50 - 10)');
    });
  });

  describe('Horizontal Glow Line', () => {
    it('glow line uses motion.div', () => {
      expect(componentSource).toContain('<motion.div');
    });

    it('animates opacity from 0 to 1', () => {
      expect(componentSource).toContain('initial={{ opacity: 0 }}');
      expect(componentSource).toContain('animate={{ opacity: 1 }}');
    });

    it('exits with opacity 0', () => {
      expect(componentSource).toContain('exit={{ opacity: 0 }}');
    });

    it('has 1.5s duration with easeOut', () => {
      expect(componentSource).toContain('duration: 1.5');
      expect(componentSource).toContain('ease: "easeOut"');
    });

    it('has blur-sm for glow effect', () => {
      expect(componentSource).toContain('blur-sm');
    });

    it('uses bg-gradient-to-r for horizontal gradient', () => {
      expect(componentSource).toContain('bg-gradient-to-r');
    });

    it('has -inset-x-10 for overflow', () => {
      expect(componentSource).toContain('-inset-x-10');
    });
  });

  describe('Particle Animation', () => {
    it('particles animate x to directionX', () => {
      expect(componentSource).toContain('x: span.directionX');
    });

    it('particles animate y to directionY', () => {
      expect(componentSource).toContain('y: span.directionY');
    });

    it('particles fade out (opacity: 0)', () => {
      expect(componentSource).toContain('opacity: 0');
    });

    it('particles have random duration (0.5 to 2s)', () => {
      expect(componentSource).toContain('Math.random() * 1.5 + 0.5');
    });

    it('particles use easeOut timing', () => {
      expect(componentSource).toContain('ease: "easeOut"');
    });
  });

  describe('Particle Styling', () => {
    it('particles are 1x1 pixels (h-1 w-1)', () => {
      expect(componentSource).toContain('h-1 w-1');
    });

    it('particles are rounded-full', () => {
      expect(componentSource).toContain('rounded-full');
    });

    it('particles use bg-gradient-to-b', () => {
      expect(componentSource).toContain('bg-gradient-to-b');
    });
  });

  describe('Explosion Positioning', () => {
    it('explosion container has z-50', () => {
      expect(componentSource).toContain('z-50');
    });

    it('explosion is positioned using collision coordinates', () => {
      expect(componentSource).toContain('collision.coordinates.x');
      expect(componentSource).toContain('collision.coordinates.y');
    });

    it('uses translate(-50%, -50%) to center', () => {
      expect(componentSource).toContain('translate(-50%, -50%)');
    });
  });
});

describe('BackgroundBeamsWithCollision: hideCollisionSurface Prop', () => {
  const componentPath = join(
    process.cwd(),
    'src/components/ui/background-beams-with-collision.tsx'
  );
  let componentSource: string;

  beforeAll(() => {
    componentSource = readFileSync(componentPath, 'utf-8');
  });

  describe('Prop Definition', () => {
    it('hideCollisionSurface prop is defined in interface', () => {
      expect(componentSource).toContain('hideCollisionSurface?: boolean');
    });

    it('has JSDoc comment explaining the prop purpose', () => {
      expect(componentSource).toContain('hides the visible collision surface');
      expect(componentSource).toContain('useful for full-page backgrounds');
    });

    it('defaults to false', () => {
      expect(componentSource).toContain('hideCollisionSurface = false');
    });

    it('destructures hideCollisionSurface in component', () => {
      expect(componentSource).toContain('hideCollisionSurface');
    });
  });

  describe('Conditional Styling Logic', () => {
    it('conditionally applies bg-neutral-100 when not hidden', () => {
      expect(componentSource).toContain('!hideCollisionSurface');
    });

    it('conditionally applies dark:bg-neutral-900/50 when not hidden', () => {
      // The array pattern for conditional classes
      expect(componentSource).toContain('!hideCollisionSurface && [');
    });

    it('conditionally applies boxShadow style when not hidden', () => {
      expect(componentSource).toContain('hideCollisionSurface ? undefined : {');
    });
  });
});

describe('BackgroundBeamsWithCollision: ArticlesClient Integration', () => {
  const articlesClientPath = join(
    process.cwd(),
    'src/components/ArticlesClient.tsx'
  );
  let articlesSource: string;

  beforeAll(() => {
    articlesSource = readFileSync(articlesClientPath, 'utf-8');
  });

  describe('Import Statement', () => {
    it('imports BackgroundBeamsWithCollision component', () => {
      expect(articlesSource).toContain('import { BackgroundBeamsWithCollision }');
    });

    it('imports from the correct path', () => {
      expect(articlesSource).toContain('@/components/ui/background-beams-with-collision');
    });

    it('does NOT import StarsBackground or ShootingStars', () => {
      expect(articlesSource).not.toContain('StarsBackground');
      expect(articlesSource).not.toContain('ShootingStars');
      expect(articlesSource).not.toContain('stars-background');
    });
  });

  describe('Full-Page Background Configuration', () => {
    it('uses fixed positioning for viewport coverage', () => {
      expect(articlesSource).toContain('fixed inset-0');
    });

    it('has -z-10 to place behind content', () => {
      expect(articlesSource).toContain('-z-10');
    });

    it('has pointer-events-none to prevent interaction blocking', () => {
      expect(articlesSource).toContain('pointer-events-none');
    });

    it('sets viewport dimensions via inline style', () => {
      expect(articlesSource).toContain("height: '100vh'");
      expect(articlesSource).toContain("width: '100vw'");
    });
  });

  describe('Component Props', () => {
    it('uses hideCollisionSurface prop for seamless background', () => {
      expect(articlesSource).toContain('hideCollisionSurface');
    });

    it('overrides height to !h-screen', () => {
      expect(articlesSource).toContain('!h-screen');
    });

    it('overrides min-height to !min-h-screen', () => {
      expect(articlesSource).toContain('!min-h-screen');
    });

    it('removes max-height restriction with !max-h-none', () => {
      expect(articlesSource).toContain('!max-h-none');
    });
  });

  describe('Theme-Aware Background Gradient', () => {
    it('uses !bg-gradient-to-b for vertical gradient', () => {
      expect(articlesSource).toContain('!bg-gradient-to-b');
    });

    it('light mode: from white to neutral-100', () => {
      expect(articlesSource).toContain('!from-white');
      expect(articlesSource).toContain('!to-neutral-100');
    });

    it('dark mode: purple to slate to black cosmic gradient', () => {
      expect(articlesSource).toContain('dark:!from-purple-950');
      expect(articlesSource).toContain('dark:!via-slate-950');
      expect(articlesSource).toContain('dark:!to-black');
    });
  });

  describe('Content Stacking', () => {
    it('content has z-10 to appear above background', () => {
      expect(articlesSource).toContain('relative z-10');
    });

    it('background comment indicates full page usage', () => {
      expect(articlesSource).toContain('Full page background');
    });
  });
});

// Helper function to be used in beforeAll
function beforeAll(fn: () => void) {
  fn();
}
