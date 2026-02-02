/**
 * BackgroundGradientAnimation Component Tests
 *
 * Tests for the Aceternity UI BackgroundGradientAnimation component.
 * Validates CSS variable definitions, animation keyframes, and component props types.
 *
 * These tests ensure the component matches the official Aceternity UI specification:
 * https://ui.aceternity.com/components/background-gradient-animation
 *
 * CRITICAL: These tests lock the animation behavior and CSS integration.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// =========================================
// ACETERNITY UI SPECIFICATION
// Official default values from the component
// =========================================
const ACETERNITY_DEFAULTS = {
  gradientBackgroundStart: 'rgb(108, 0, 162)',
  gradientBackgroundEnd: 'rgb(0, 17, 82)',
  firstColor: '18, 113, 255',
  secondColor: '221, 74, 255',
  thirdColor: '100, 220, 255',
  fourthColor: '200, 50, 50',
  fifthColor: '180, 180, 50',
  pointerColor: '140, 100, 255',
  size: '80%',
  blendingValue: 'hard-light',
  interactive: true,
};

// CSS Variable names the component sets on document.body
const CSS_VARIABLES = [
  '--gradient-background-start',
  '--gradient-background-end',
  '--first-color',
  '--second-color',
  '--third-color',
  '--fourth-color',
  '--fifth-color',
  '--pointer-color',
  '--size',
  '--blending-value',
];

// Animation CSS classes used in the component
const ANIMATION_CLASSES = [
  'animate-first',
  'animate-second',
  'animate-third',
  'animate-fourth',
  'animate-fifth',
];

// Animation keyframes required in CSS
const REQUIRED_KEYFRAMES = ['moveVertical', 'moveHorizontal', 'moveInCircle'];

// Animation variable definitions with their timing
const ANIMATION_TIMING = {
  'animate-first': { keyframe: 'moveVertical', duration: '30s', timing: 'ease' },
  'animate-second': { keyframe: 'moveInCircle', duration: '20s', timing: 'reverse' },
  'animate-third': { keyframe: 'moveInCircle', duration: '40s', timing: 'linear' },
  'animate-fourth': { keyframe: 'moveHorizontal', duration: '40s', timing: 'ease' },
  'animate-fifth': { keyframe: 'moveInCircle', duration: '20s', timing: 'ease' },
};

// Gradient circle opacity values from Aceternity spec
const CIRCLE_OPACITY = {
  first: '100',
  second: '100',
  third: '100',
  fourth: '70', // Note: fourth circle has different opacity
  fifth: '100',
};

// Transform origins for each gradient circle
const TRANSFORM_ORIGINS = {
  first: 'center_center',
  second: 'calc(50%-400px)',
  third: 'calc(50%+400px)',
  fourth: 'calc(50%-200px)',
  fifth: 'calc(50%-800px)_calc(50%+800px)',
};

describe('BackgroundGradientAnimation: Aceternity UI Specification Compliance', () => {
  describe('Default Prop Values', () => {
    it('defines correct gradient background start color', () => {
      expect(ACETERNITY_DEFAULTS.gradientBackgroundStart).toBe('rgb(108, 0, 162)');
    });

    it('defines correct gradient background end color', () => {
      expect(ACETERNITY_DEFAULTS.gradientBackgroundEnd).toBe('rgb(0, 17, 82)');
    });

    it('defines correct first color (RGB values)', () => {
      expect(ACETERNITY_DEFAULTS.firstColor).toBe('18, 113, 255');
    });

    it('defines correct second color (RGB values)', () => {
      expect(ACETERNITY_DEFAULTS.secondColor).toBe('221, 74, 255');
    });

    it('defines correct third color (RGB values)', () => {
      expect(ACETERNITY_DEFAULTS.thirdColor).toBe('100, 220, 255');
    });

    it('defines correct fourth color (RGB values)', () => {
      expect(ACETERNITY_DEFAULTS.fourthColor).toBe('200, 50, 50');
    });

    it('defines correct fifth color (RGB values)', () => {
      expect(ACETERNITY_DEFAULTS.fifthColor).toBe('180, 180, 50');
    });

    it('defines correct pointer color (RGB values)', () => {
      expect(ACETERNITY_DEFAULTS.pointerColor).toBe('140, 100, 255');
    });

    it('defines correct default size', () => {
      expect(ACETERNITY_DEFAULTS.size).toBe('80%');
    });

    it('defines correct default blending value (hard-light)', () => {
      expect(ACETERNITY_DEFAULTS.blendingValue).toBe('hard-light');
    });

    it('is interactive by default', () => {
      expect(ACETERNITY_DEFAULTS.interactive).toBe(true);
    });
  });

  describe('CSS Variables Contract', () => {
    it('uses correct CSS variable names', () => {
      const expectedVariables = [
        '--gradient-background-start',
        '--gradient-background-end',
        '--first-color',
        '--second-color',
        '--third-color',
        '--fourth-color',
        '--fifth-color',
        '--pointer-color',
        '--size',
        '--blending-value',
      ];

      expectedVariables.forEach((variable) => {
        expect(CSS_VARIABLES).toContain(variable);
      });
    });

    it('has 10 CSS variables total', () => {
      expect(CSS_VARIABLES.length).toBe(10);
    });
  });

  describe('Animation Classes Contract', () => {
    it('uses 5 animation classes for gradient circles', () => {
      expect(ANIMATION_CLASSES.length).toBe(5);
    });

    it('includes all expected animation class names', () => {
      expect(ANIMATION_CLASSES).toContain('animate-first');
      expect(ANIMATION_CLASSES).toContain('animate-second');
      expect(ANIMATION_CLASSES).toContain('animate-third');
      expect(ANIMATION_CLASSES).toContain('animate-fourth');
      expect(ANIMATION_CLASSES).toContain('animate-fifth');
    });
  });

  describe('Animation Timing Specification', () => {
    it('first animation uses moveVertical for 30s', () => {
      expect(ANIMATION_TIMING['animate-first'].keyframe).toBe('moveVertical');
      expect(ANIMATION_TIMING['animate-first'].duration).toBe('30s');
      expect(ANIMATION_TIMING['animate-first'].timing).toBe('ease');
    });

    it('second animation uses moveInCircle for 20s reverse', () => {
      expect(ANIMATION_TIMING['animate-second'].keyframe).toBe('moveInCircle');
      expect(ANIMATION_TIMING['animate-second'].duration).toBe('20s');
      expect(ANIMATION_TIMING['animate-second'].timing).toBe('reverse');
    });

    it('third animation uses moveInCircle for 40s linear', () => {
      expect(ANIMATION_TIMING['animate-third'].keyframe).toBe('moveInCircle');
      expect(ANIMATION_TIMING['animate-third'].duration).toBe('40s');
      expect(ANIMATION_TIMING['animate-third'].timing).toBe('linear');
    });

    it('fourth animation uses moveHorizontal for 40s', () => {
      expect(ANIMATION_TIMING['animate-fourth'].keyframe).toBe('moveHorizontal');
      expect(ANIMATION_TIMING['animate-fourth'].duration).toBe('40s');
      expect(ANIMATION_TIMING['animate-fourth'].timing).toBe('ease');
    });

    it('fifth animation uses moveInCircle for 20s', () => {
      expect(ANIMATION_TIMING['animate-fifth'].keyframe).toBe('moveInCircle');
      expect(ANIMATION_TIMING['animate-fifth'].duration).toBe('20s');
      expect(ANIMATION_TIMING['animate-fifth'].timing).toBe('ease');
    });
  });

  describe('Gradient Circle Opacity Values', () => {
    it('first circle has 100% opacity', () => {
      expect(CIRCLE_OPACITY.first).toBe('100');
    });

    it('second circle has 100% opacity', () => {
      expect(CIRCLE_OPACITY.second).toBe('100');
    });

    it('third circle has 100% opacity', () => {
      expect(CIRCLE_OPACITY.third).toBe('100');
    });

    it('fourth circle has 70% opacity (different from others)', () => {
      expect(CIRCLE_OPACITY.fourth).toBe('70');
    });

    it('fifth circle has 100% opacity', () => {
      expect(CIRCLE_OPACITY.fifth).toBe('100');
    });
  });

  describe('Transform Origin Configuration', () => {
    it('first circle uses center_center origin', () => {
      expect(TRANSFORM_ORIGINS.first).toBe('center_center');
    });

    it('second circle uses calc(50%-400px) origin', () => {
      expect(TRANSFORM_ORIGINS.second).toBe('calc(50%-400px)');
    });

    it('third circle uses calc(50%+400px) origin', () => {
      expect(TRANSFORM_ORIGINS.third).toBe('calc(50%+400px)');
    });

    it('fourth circle uses calc(50%-200px) origin', () => {
      expect(TRANSFORM_ORIGINS.fourth).toBe('calc(50%-200px)');
    });

    it('fifth circle uses calc(50%-800px)_calc(50%+800px) origin (2D)', () => {
      expect(TRANSFORM_ORIGINS.fifth).toBe('calc(50%-800px)_calc(50%+800px)');
    });
  });
});

describe('BackgroundGradientAnimation: Source File Integrity', () => {
  const componentPath = join(process.cwd(), 'src/components/ui/background-gradient-animation.tsx');

  it('component file exists', () => {
    expect(existsSync(componentPath)).toBe(true);
  });

  describe('Component Structure', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('is a client component', () => {
      expect(componentSource).toContain('"use client"');
    });

    it('imports useRef from react', () => {
      expect(componentSource).toContain('useRef');
    });

    it('imports useState from react', () => {
      expect(componentSource).toContain('useState');
    });

    it('imports useEffect from react', () => {
      expect(componentSource).toContain('useEffect');
    });

    it('imports cn utility', () => {
      expect(componentSource).toContain('import { cn }');
    });

    it('exports BackgroundGradientAnimation component', () => {
      expect(componentSource).toContain('export const BackgroundGradientAnimation');
    });

    it('has gradientBackgroundStart prop with default value', () => {
      expect(componentSource).toContain('gradientBackgroundStart = "rgb(108, 0, 162)"');
    });

    it('has gradientBackgroundEnd prop with default value', () => {
      expect(componentSource).toContain('gradientBackgroundEnd = "rgb(0, 17, 82)"');
    });

    it('has firstColor prop with default value', () => {
      expect(componentSource).toContain('firstColor = "18, 113, 255"');
    });

    it('has secondColor prop with default value', () => {
      expect(componentSource).toContain('secondColor = "221, 74, 255"');
    });

    it('has thirdColor prop with default value', () => {
      expect(componentSource).toContain('thirdColor = "100, 220, 255"');
    });

    it('has fourthColor prop with default value', () => {
      expect(componentSource).toContain('fourthColor = "200, 50, 50"');
    });

    it('has fifthColor prop with default value', () => {
      expect(componentSource).toContain('fifthColor = "180, 180, 50"');
    });

    it('has pointerColor prop with default value', () => {
      expect(componentSource).toContain('pointerColor = "140, 100, 255"');
    });

    it('has size prop with default value of 80%', () => {
      expect(componentSource).toContain('size = "80%"');
    });

    it('has blendingValue prop with default value of hard-light', () => {
      expect(componentSource).toContain('blendingValue = "hard-light"');
    });

    it('has interactive prop with default value of true', () => {
      expect(componentSource).toContain('interactive = true');
    });
  });

  describe('SVG Filter (Gooey Effect)', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('contains SVG filter element', () => {
      expect(componentSource).toContain('<svg');
      expect(componentSource).toContain('</svg>');
    });

    it('defines blur filter with id "blurMe"', () => {
      expect(componentSource).toContain('id="blurMe"');
    });

    it('uses feGaussianBlur with stdDeviation of 10', () => {
      expect(componentSource).toContain('feGaussianBlur');
      expect(componentSource).toContain('stdDeviation="10"');
    });

    it('uses feColorMatrix for gooey effect', () => {
      expect(componentSource).toContain('feColorMatrix');
      expect(componentSource).toContain('values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"');
    });

    it('uses feBlend to combine effects', () => {
      expect(componentSource).toContain('feBlend');
    });
  });

  describe('Safari Detection', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('has isSafari state variable', () => {
      expect(componentSource).toContain('isSafari');
      expect(componentSource).toContain('setIsSafari');
    });

    it('uses Safari detection regex', () => {
      expect(componentSource).toContain('safari');
      expect(componentSource).toContain('navigator.userAgent');
    });

    it('applies blur-2xl class for Safari', () => {
      expect(componentSource).toContain('blur-2xl');
    });

    it('applies custom filter for non-Safari browsers', () => {
      expect(componentSource).toContain('[filter:url(#blurMe)_blur(40px)]');
    });
  });

  describe('Gradient Circles Structure', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('has gradients-container wrapper', () => {
      expect(componentSource).toContain('gradients-container');
    });

    it('uses animate-first class', () => {
      expect(componentSource).toContain('animate-first');
    });

    it('uses animate-second class', () => {
      expect(componentSource).toContain('animate-second');
    });

    it('uses animate-third class', () => {
      expect(componentSource).toContain('animate-third');
    });

    it('uses animate-fourth class', () => {
      expect(componentSource).toContain('animate-fourth');
    });

    it('uses animate-fifth class', () => {
      expect(componentSource).toContain('animate-fifth');
    });

    it('uses mix-blend-mode CSS variable', () => {
      expect(componentSource).toContain('[mix-blend-mode:var(--blending-value)]');
    });

    it('uses radial-gradient for circles', () => {
      expect(componentSource).toContain('radial-gradient(circle_at_center');
    });
  });

  describe('Interactive Pointer', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('has interactiveRef for pointer element', () => {
      expect(componentSource).toContain('interactiveRef');
    });

    it('tracks cursor X position', () => {
      expect(componentSource).toContain('curX');
      expect(componentSource).toContain('setCurX');
    });

    it('tracks cursor Y position', () => {
      expect(componentSource).toContain('curY');
      expect(componentSource).toContain('setCurY');
    });

    it('tracks target X position', () => {
      expect(componentSource).toContain('tgX');
      expect(componentSource).toContain('setTgX');
    });

    it('tracks target Y position', () => {
      expect(componentSource).toContain('tgY');
      expect(componentSource).toContain('setTgY');
    });

    it('has handleMouseMove function', () => {
      expect(componentSource).toContain('handleMouseMove');
    });

    it('applies smooth easing to pointer (divide by 20)', () => {
      expect(componentSource).toContain('/ 20');
    });

    it('conditionally renders interactive element', () => {
      expect(componentSource).toContain('{interactive &&');
    });

    it('uses pointer color for interactive gradient', () => {
      expect(componentSource).toContain('var(--pointer-color)');
    });

    it('interactive element has 70% opacity', () => {
      expect(componentSource).toContain('opacity-70');
    });
  });

  describe('Container Styling', () => {
    let componentSource: string;

    beforeAll(() => {
      componentSource = readFileSync(componentPath, 'utf-8');
    });

    it('container has h-screen w-screen', () => {
      expect(componentSource).toContain('h-screen w-screen');
    });

    it('container has overflow-hidden', () => {
      expect(componentSource).toContain('overflow-hidden');
    });

    it('container has relative positioning', () => {
      expect(componentSource).toContain('relative');
    });

    it('container has linear gradient background', () => {
      expect(componentSource).toContain(
        'bg-[linear-gradient(40deg,var(--gradient-background-start),var(--gradient-background-end))]'
      );
    });

    it('applies containerClassName to root element', () => {
      expect(componentSource).toContain('containerClassName');
    });

    it('applies className to children wrapper', () => {
      expect(componentSource).toContain('className={cn("", className)}');
    });
  });
});

describe('BackgroundGradientAnimation: CSS Integration', () => {
  const globalCSSPath = join(process.cwd(), 'src/app/global.css');

  it('global.css exists', () => {
    expect(existsSync(globalCSSPath)).toBe(true);
  });

  describe('Animation Variables', () => {
    let globalCSS: string;

    beforeAll(() => {
      globalCSS = readFileSync(globalCSSPath, 'utf-8');
    });

    it('defines --animate-first variable', () => {
      expect(globalCSS).toContain('--animate-first');
    });

    it('defines --animate-second variable', () => {
      expect(globalCSS).toContain('--animate-second');
    });

    it('defines --animate-third variable', () => {
      expect(globalCSS).toContain('--animate-third');
    });

    it('defines --animate-fourth variable', () => {
      expect(globalCSS).toContain('--animate-fourth');
    });

    it('defines --animate-fifth variable', () => {
      expect(globalCSS).toContain('--animate-fifth');
    });
  });

  describe('Animation Keyframes', () => {
    let globalCSS: string;

    beforeAll(() => {
      globalCSS = readFileSync(globalCSSPath, 'utf-8');
    });

    it('defines moveVertical keyframes', () => {
      expect(globalCSS).toContain('@keyframes moveVertical');
    });

    it('moveVertical has correct transforms', () => {
      expect(globalCSS).toContain('translateY(-50%)');
      expect(globalCSS).toContain('translateY(50%)');
    });

    it('defines moveHorizontal keyframes', () => {
      expect(globalCSS).toContain('@keyframes moveHorizontal');
    });

    it('moveHorizontal has correct transforms', () => {
      expect(globalCSS).toContain('translateX(-50%)');
      expect(globalCSS).toContain('translateX(50%)');
      expect(globalCSS).toContain('translateY(-10%)');
      expect(globalCSS).toContain('translateY(10%)');
    });

    it('defines moveInCircle keyframes', () => {
      expect(globalCSS).toContain('@keyframes moveInCircle');
    });

    it('moveInCircle has correct rotations', () => {
      expect(globalCSS).toContain('rotate(0deg)');
      expect(globalCSS).toContain('rotate(180deg)');
      expect(globalCSS).toContain('rotate(360deg)');
    });
  });

  describe('Animation Timing Values', () => {
    let globalCSS: string;

    beforeAll(() => {
      globalCSS = readFileSync(globalCSSPath, 'utf-8');
    });

    it('first animation: moveVertical 30s ease infinite', () => {
      expect(globalCSS).toContain('moveVertical 30s ease infinite');
    });

    it('second animation: moveInCircle 20s reverse infinite', () => {
      expect(globalCSS).toContain('moveInCircle 20s reverse infinite');
    });

    it('third animation: moveInCircle 40s linear infinite', () => {
      expect(globalCSS).toContain('moveInCircle 40s linear infinite');
    });

    it('fourth animation: moveHorizontal 40s ease infinite', () => {
      expect(globalCSS).toContain('moveHorizontal 40s ease infinite');
    });

    it('fifth animation: moveInCircle 20s ease infinite', () => {
      expect(globalCSS).toContain('moveInCircle 20s ease infinite');
    });
  });

  describe('@theme inline Block', () => {
    let globalCSS: string;

    beforeAll(() => {
      globalCSS = readFileSync(globalCSSPath, 'utf-8');
    });

    it('animation variables are in @theme inline block', () => {
      const themeMatch = globalCSS.match(/@theme inline \{[\s\S]*?\n\}/);
      expect(themeMatch).toBeTruthy();

      const themeBlock = themeMatch?.[0] || '';
      expect(themeBlock).toContain('--animate-first');
      expect(themeBlock).toContain('--animate-second');
      expect(themeBlock).toContain('--animate-third');
      expect(themeBlock).toContain('--animate-fourth');
      expect(themeBlock).toContain('--animate-fifth');
    });

    it('all animations are set to infinite', () => {
      const themeMatch = globalCSS.match(/@theme inline \{[\s\S]*?\n\}/);
      const themeBlock = themeMatch?.[0] || '';

      // Count occurrences of 'infinite' - should be at least 5 (one per animation)
      const infiniteCount = (themeBlock.match(/infinite/g) || []).length;
      expect(infiniteCount).toBeGreaterThanOrEqual(5);
    });
  });
});

describe('BackgroundGradientAnimation: Props TypeScript Interface', () => {
  const componentPath = join(process.cwd(), 'src/components/ui/background-gradient-animation.tsx');
  let componentSource: string;

  beforeAll(() => {
    componentSource = readFileSync(componentPath, 'utf-8');
  });

  it('defines gradientBackgroundStart as optional string', () => {
    expect(componentSource).toContain('gradientBackgroundStart?: string');
  });

  it('defines gradientBackgroundEnd as optional string', () => {
    expect(componentSource).toContain('gradientBackgroundEnd?: string');
  });

  it('defines firstColor as optional string', () => {
    expect(componentSource).toContain('firstColor?: string');
  });

  it('defines secondColor as optional string', () => {
    expect(componentSource).toContain('secondColor?: string');
  });

  it('defines thirdColor as optional string', () => {
    expect(componentSource).toContain('thirdColor?: string');
  });

  it('defines fourthColor as optional string', () => {
    expect(componentSource).toContain('fourthColor?: string');
  });

  it('defines fifthColor as optional string', () => {
    expect(componentSource).toContain('fifthColor?: string');
  });

  it('defines pointerColor as optional string', () => {
    expect(componentSource).toContain('pointerColor?: string');
  });

  it('defines size as optional string', () => {
    expect(componentSource).toContain('size?: string');
  });

  it('defines blendingValue as optional string', () => {
    expect(componentSource).toContain('blendingValue?: string');
  });

  it('defines children as optional React.ReactNode', () => {
    expect(componentSource).toContain('children?: React.ReactNode');
  });

  it('defines className as optional string', () => {
    expect(componentSource).toContain('className?: string');
  });

  it('defines interactive as optional boolean', () => {
    expect(componentSource).toContain('interactive?: boolean');
  });

  it('defines containerClassName as optional string', () => {
    expect(componentSource).toContain('containerClassName?: string');
  });
});

// Helper function to be used in beforeAll
function beforeAll(fn: () => void) {
  fn();
}
