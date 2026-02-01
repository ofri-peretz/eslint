import { describe, it, expect } from 'vitest';
import { getMDXComponents } from '../src/mdx-components';

/**
 * MDX Components Registry Tests
 * 
 * These tests ensure all required MDX components are properly registered
 * and available for use in documentation pages.
 * 
 * IMPORTANT: Add new components here when you add them to mdx-components.tsx
 * This prevents "Component not found" runtime errors in production.
 */

describe('MDX Components Registry', () => {
  describe('Core Components Registration', () => {
    it('should export getMDXComponents function', () => {
      expect(getMDXComponents).toBeDefined();
      expect(typeof getMDXComponents).toBe('function');
    });

    it('should return an object with components', () => {
      const components = getMDXComponents();
      expect(components).toBeDefined();
      expect(typeof components).toBe('object');
    });
  });

  describe('Fumadocs UI Components', () => {
    const components = getMDXComponents();

    it('should have Callout component', () => {
      expect(components.Callout).toBeDefined();
    });

    it('should have Card and Cards components', () => {
      expect(components.Card).toBeDefined();
      expect(components.Cards).toBeDefined();
    });

    it('should have Steps and Step components', () => {
      expect(components.Steps).toBeDefined();
      expect(components.Step).toBeDefined();
    });

    it('should have Tab and Tabs components', () => {
      expect(components.Tab).toBeDefined();
      expect(components.Tabs).toBeDefined();
    });
  });

  describe('Custom Documentation Components', () => {
    const components = getMDXComponents();

    it('should have Mermaid component for diagrams', () => {
      expect(components.Mermaid).toBeDefined();
    });
  });

  describe('Twoslash Components', () => {
    const components = getMDXComponents();

    it('should have Twoslash components spread into registry', () => {
      // Twoslash spread operator adds TypeScript hint components
      // The actual components vary by version, so we just verify
      // the registry has more components than just our explicit ones
      const componentCount = Object.keys(components).length;
      expect(componentCount).toBeGreaterThan(5);
    });
  });

  describe('Required Component Count', () => {
    const components = getMDXComponents();
    
    it('should have at least 10 registered components', () => {
      const componentKeys = Object.keys(components).filter(
        key => !['pre', 'a'].includes(key) // Exclude built-in overrides
      );
      
      // Core components + Fumadocs defaults + Twoslash
      expect(componentKeys.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Pre Element Handler', () => {
    const components = getMDXComponents();

    it('should have custom pre handler from Fumadocs', () => {
      expect(components.pre).toBeDefined();
    });
  });
});

/**
 * Component Usage Validation
 * 
 * These tests check that commonly used component patterns work correctly.
 */
describe('MDX Component Integration', () => {
  it('should allow merging custom components', () => {
    const customComponents = {
      CustomComponent: () => null,
    };
    
    const merged = getMDXComponents(customComponents);
    
    expect(merged.CustomComponent).toBeDefined();
    // Original components should still exist
    expect(merged.Mermaid).toBeDefined();
    expect(merged.Steps).toBeDefined();
  });

  it('should allow overriding default components', () => {
    const CustomMermaid = () => null;
    const merged = getMDXComponents({ Mermaid: CustomMermaid });
    
    // The custom component should take precedence
    expect(merged.Mermaid).toBe(CustomMermaid);
  });
});
