import { eslintPluginSecurityExpert } from './eslint-plugin-security-expert';

describe('eslintPluginSecurityExpert', () => {
  it('should work', () => {
    expect(eslintPluginSecurityExpert()).toEqual(
      'eslint-plugin-security-expert',
    );
  });
});
