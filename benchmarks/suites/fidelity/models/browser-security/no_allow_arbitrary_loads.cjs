const { tag } = require('../../lib.cjs');

const KEYS = {
  AL: 'NSAllowsArbitraryLoads',
  ALWeb: 'NSAllowsArbitraryLoadsInWebContent',
  ALMedia: 'NSAllowsArbitraryLoadsForMedia',
  LocalNet: 'NSAllowsLocalNetworking',
  ExcInsecure: 'NSExceptionAllowsInsecureHTTPLoads',
  ThirdParty: 'NSThirdPartyExceptionAllowsInsecureHTTPLoads',
  Temporary: 'NSTemporaryExceptionAllowsInsecureHTTPLoads',
  OldLower: 'allowArbitraryLoads',
  CustomKey: 'MyInsecureKey',
};

module.exports = {
  domain: 108,
  traces: 1200,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-allow-arbitrary-loads',
  filename: 'app.config.ts',
  key: (s) =>
    `${tag(s.key)}|value=${s.value}|${tag(s.spelling)}|${tag(s.opts)}`,
  config: (s) =>
    tag(s.opts) === 'CustomKeys'
      ? { insecureLoadKeys: ['MyInsecureKey'] }
      : undefined,
  code: (s) => {
    const k = KEYS[tag(s.key)];
    const prop = { IdentKey: k, StringKey: `'${k}'`, ComputedKey: `['${k}']` }[
      tag(s.spelling)
    ];
    return [
      'export default {',
      '  ios: {',
      '    infoPlist: {',
      `      NSAppTransportSecurity: { ${prop}: ${s.value} },`,
      '    },',
      '  },',
      '};',
    ].join('\n');
  },
  model: (s) => s.verdict,
};
