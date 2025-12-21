import { describe, it, expect } from 'vitest';
import plugin from './index';

describe('eslint-plugin-pg', () => {
  it('should export a plugin object', () => {
    expect(plugin).toBeDefined();
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-pg');
  });

  it('should export rules object', () => {
    expect(plugin.rules).toBeDefined();
  });
});
