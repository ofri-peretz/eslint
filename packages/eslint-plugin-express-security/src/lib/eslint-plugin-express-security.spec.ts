import { eslintPluginExpressSecurity } from './eslint-plugin-express-security';

describe('eslintPluginExpressSecurity', () => {
  it('should work', () => {
    expect(eslintPluginExpressSecurity()).toEqual(
      'eslint-plugin-express-security',
    );
  });
});
