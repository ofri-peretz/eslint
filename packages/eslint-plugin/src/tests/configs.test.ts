/**
 * Tests for ESLint plugin configurations
 * 
 * Verifies that all exported configurations have the expected structure
 * and rules.
 */
import { describe, it, expect } from 'vitest';
import { configs } from '../index';

describe('ESLint Plugin Configurations', () => {
  describe('configs export', () => {
    it('should export all expected configurations', () => {
      expect(configs).toBeDefined();
      expect(configs.recommended).toBeDefined();
      expect(configs.strict).toBeDefined();
      expect(configs.security).toBeDefined();
      expect(configs.react).toBeDefined();
      expect(configs.migration).toBeDefined();
      expect(configs.accessibility).toBeDefined();
      expect(configs.performance).toBeDefined();
      expect(configs.domain).toBeDefined();
      expect(configs.sonarqube).toBeDefined();
      expect(configs['react-modern']).toBeDefined();
    });
  });

  describe('react-modern configuration', () => {
    const reactModernConfig = configs['react-modern'];

    it('should have plugin defined', () => {
      expect(reactModernConfig.plugins).toBeDefined();
      expect(reactModernConfig.plugins?.['@forge-js/llm-optimized']).toBeDefined();
    });

    it('should have rules defined', () => {
      expect(reactModernConfig.rules).toBeDefined();
    });

    describe('hooks-focused rules (enabled)', () => {
      const rules = reactModernConfig.rules ?? {};

      it('should enable performance rules for React hooks', () => {
        expect(rules['@forge-js/llm-optimized/performance/react-no-inline-functions']).toBe('warn');
        expect(rules['@forge-js/llm-optimized/performance/react-render-optimization']).toBe('warn');
        expect(rules['@forge-js/llm-optimized/performance/no-unnecessary-rerenders']).toBe('warn');
        expect(rules['@forge-js/llm-optimized/performance/no-memory-leak-listeners']).toBe('warn');
      });

      it('should enable JSX rules important for hooks', () => {
        expect(rules['@forge-js/llm-optimized/react/jsx-key']).toBe('error');
        expect(rules['@forge-js/llm-optimized/react/jsx-no-bind']).toBe('warn');
      });

      it('should enable functional component rules', () => {
        expect(rules['@forge-js/llm-optimized/react/no-this-in-sfc']).toBe('error');
        expect(rules['@forge-js/llm-optimized/react/no-unknown-property']).toBe('error');
        expect(rules['@forge-js/llm-optimized/react/no-children-prop']).toBe('warn');
        expect(rules['@forge-js/llm-optimized/react/no-danger']).toBe('warn');
      });

      it('should enable accessibility rules', () => {
        expect(rules['@forge-js/llm-optimized/accessibility/img-requires-alt']).toBe('error');
      });

      it('should enable modern pattern rules', () => {
        expect(rules['@forge-js/llm-optimized/react/no-object-type-as-default-prop']).toBe('warn');
        expect(rules['@forge-js/llm-optimized/react/no-string-refs']).toBe('error');
      });
    });

    describe('class component rules (disabled)', () => {
      const rules = reactModernConfig.rules ?? {};

      it('should disable class-specific setState rules', () => {
        expect(rules['@forge-js/llm-optimized/react/no-set-state']).toBe('off');
        expect(rules['@forge-js/llm-optimized/react/no-direct-mutation-state']).toBe('off');
        expect(rules['@forge-js/llm-optimized/react/no-access-state-in-setstate']).toBe('off');
        expect(rules['@forge-js/llm-optimized/react/no-did-mount-set-state']).toBe('off');
        expect(rules['@forge-js/llm-optimized/react/no-did-update-set-state']).toBe('off');
      });

      it('should disable class-specific lifecycle rules', () => {
        expect(rules['@forge-js/llm-optimized/react/no-is-mounted']).toBe('off');
        expect(rules['@forge-js/llm-optimized/react/no-arrow-function-lifecycle']).toBe('off');
        expect(rules['@forge-js/llm-optimized/react/no-redundant-should-component-update']).toBe('off');
        expect(rules['@forge-js/llm-optimized/react/require-render-return']).toBe('off');
      });

      it('should disable class-specific structure rules', () => {
        expect(rules['@forge-js/llm-optimized/react/sort-comp']).toBe('off');
        expect(rules['@forge-js/llm-optimized/react/state-in-constructor']).toBe('off');
        expect(rules['@forge-js/llm-optimized/react/static-property-placement']).toBe('off');
        expect(rules['@forge-js/llm-optimized/react/prefer-es6-class']).toBe('off');
      });

      it('should disable legacy PropTypes/defaultProps rules', () => {
        expect(rules['@forge-js/llm-optimized/react/default-props-match-prop-types']).toBe('off');
        expect(rules['@forge-js/llm-optimized/react/require-default-props']).toBe('off');
        expect(rules['@forge-js/llm-optimized/react/prop-types']).toBe('off');
        expect(rules['@forge-js/llm-optimized/react/require-optimization']).toBe('off');
      });

      it('should disable migration rule (opt-in only)', () => {
        expect(rules['@forge-js/llm-optimized/migration/react-class-to-hooks']).toBe('off');
      });

      it('should disable legacy React import rule (React 17+)', () => {
        expect(rules['@forge-js/llm-optimized/react/react-in-jsx-scope']).toBe('off');
      });
    });
  });

  describe('recommended configuration', () => {
    const recommendedConfig = configs.recommended;

    it('should have plugin defined', () => {
      expect(recommendedConfig.plugins).toBeDefined();
    });

    it('should have rules defined', () => {
      expect(recommendedConfig.rules).toBeDefined();
    });
  });

  describe('react configuration', () => {
    const reactConfig = configs.react;

    it('should have plugin defined', () => {
      expect(reactConfig.plugins).toBeDefined();
    });

    it('should include migration rule for class-to-hooks', () => {
      expect(reactConfig.rules?.['@forge-js/llm-optimized/migration/react-class-to-hooks']).toBe('warn');
    });
  });

  describe('security configuration', () => {
    const securityConfig = configs.security;

    it('should have plugin defined', () => {
      expect(securityConfig.plugins).toBeDefined();
    });

    it('should have rules defined', () => {
      expect(securityConfig.rules).toBeDefined();
    });
  });

  describe('performance configuration', () => {
    const performanceConfig = configs.performance;

    it('should have plugin defined', () => {
      expect(performanceConfig.plugins).toBeDefined();
    });

    it('should include React performance rules', () => {
      const rules = performanceConfig.rules ?? {};
      expect(rules['@forge-js/llm-optimized/performance/react-no-inline-functions']).toBe('warn');
      expect(rules['@forge-js/llm-optimized/performance/react-render-optimization']).toBe('warn');
      expect(rules['@forge-js/llm-optimized/performance/no-unnecessary-rerenders']).toBe('warn');
    });
  });
});

