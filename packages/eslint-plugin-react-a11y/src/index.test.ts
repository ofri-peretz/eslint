import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import plugin from './index';
import { rules, configs, flatConfigs } from './index';

describe('eslint-plugin-react-a11y plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-react-a11y');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all react-a11y rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    
    // Check some core rules
    expect(ruleKeys).toContain('alt-text');
    expect(ruleKeys).toContain('anchor-has-content');
    expect(ruleKeys).toContain('aria-props');
    
    expect(ruleKeys.length).toBe(37);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['react-a11y']).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^react-a11y\//);
      });
      
      expect(recommendedRules['react-a11y/alt-text']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['react-a11y']).toBeDefined();
      
      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^react-a11y\//);
      });
      
      expect(strictRules['react-a11y/alt-text']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });

    it.each(['flagship', 'recommended', 'strict', 'wcag-a', 'wcag-aa'])(
      'parses JSX under the %s preset, as jsx-a11y\'s flat presets do',
      (preset) => {
        expect(
          configs[preset].languageOptions?.parserOptions?.ecmaFeatures,
        ).toEqual({ jsx: true });
        expect(configs[preset].name).toBe(`react-a11y/${preset}`);
      },
    );

    it('offers jsx-a11y\'s flatConfigs spelling for recommended and strict', () => {
      expect(Object.keys(flatConfigs).sort()).toEqual(['recommended', 'strict']);
      expect(flatConfigs.recommended).toBe(configs.recommended);
      expect(flatConfigs.strict).toBe(configs.strict);
    });

    it('lets a .js file with JSX parse under a preset', () => {
      const linter = new Linter();
      const messages = linter.verify('const a = <div />;', [
        { ...flatConfigs.recommended, files: ['**/*.js'] } as never,
      ], { filename: 'a.js' });
      expect(messages.filter((m) => m.fatal)).toEqual([]);
    });

    it('should provide WCAG configurations', () => {
      expect(configs['wcag-a']).toBeDefined();
      expect(configs['wcag-aa']).toBeDefined();
    });
  });
});
