import { describe, it, expect } from 'vitest';
import plugin from '../index';
import { rules } from '../index';
import { configs } from '../index';

describe('Plugin Entry Point', () => {
  it('should export the plugin object', () => {
    expect(plugin).toBeDefined();
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta.name).toBe('eslint-plugin-import-next');
    expect(plugin.rules).toBeDefined();
  });

  it('should export all rules', () => {
    expect(rules).toBeDefined();
    expect(Object.keys(rules).length).toBeGreaterThan(0);
    
    // Check for critical rules
    expect(rules['no-unresolved']).toBeDefined();
    expect(rules['named']).toBeDefined();
    expect(rules['default']).toBeDefined();
    expect(rules['namespace']).toBeDefined();
    expect(rules['no-cycle']).toBeDefined();
  });

  it('should export configurations', () => {
    expect(configs).toBeDefined();
    
    // Check specific configs
    expect(configs.recommended).toBeDefined();
    expect(configs.strict).toBeDefined();
    expect(configs.typescript).toBeDefined();
    expect(configs['module-resolution']).toBeDefined();
    expect(configs.esm).toBeDefined();
    
    // Check config structure
    expect(configs.recommended.plugins['import-next']).toBeDefined();
    expect(configs.recommended.rules['import-next/no-unresolved']).toBe('error');
  });

  it('should be consistent between plugin.rules and exported rules', () => {
    expect(plugin.rules).toBe(rules);
  });
});
