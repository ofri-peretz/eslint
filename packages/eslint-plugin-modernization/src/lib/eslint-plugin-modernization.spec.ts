import { describe, it, expect } from 'vitest';
import { eslintPluginModernization } from './eslint-plugin-modernization';

describe('eslintPluginModernization', () => {
  it('should work', () => {
    expect(eslintPluginModernization()).toEqual('eslint-plugin-modernization');
  });
});
