import { eslintPluginNestjsSecurity } from './eslint-plugin-nestjs-security';

describe('eslintPluginNestjsSecurity', () => {
  it('should work', () => {
    expect(eslintPluginNestjsSecurity()).toEqual(
      'eslint-plugin-nestjs-security',
    );
  });
});
