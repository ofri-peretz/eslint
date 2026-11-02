const { tag } = require('../../lib.cjs');

module.exports = {
  pkg: 'eslint-plugin-node-security',
  rule: 'require-secure-deletion',
  domain: 80, // 10 names x 4 access shapes x additionalSensitiveProperties set/unset
  traces: 1200,
  key: (s) => `${tag(s.name)}|${tag(s.access)}|extraPin=${s.extraPin}`,
  config: (s) =>
    s.extraPin ? { additionalSensitiveProperties: ['pin code'] } : {},
  code: (s) => {
    const n = {
      Password: 'password',
      RefreshToken: 'refreshToken',
      ApiKeySnake: 'api_key',
      AccessTokenUpper: 'ACCESS_TOKEN',
      PrivateKey: 'privateKey',
      TokenCount: 'tokenCount',
      Tokenizer: 'tokenizer',
      Cacheable: 'cacheable',
      PinCode: 'pinCode',
      Pincode: 'pincode',
    }[tag(s.name)];
    const expr = {
      Dot: `delete record.${n};`,
      LiteralSubscript: `delete record['${n}'];`,
      Optional: `delete record?.${n};`,
      DynamicKey: `delete record[field]; // ${n}`,
    }[tag(s.access)];
    return `export function scrub(record: any, field: string) {\n  ${expr}\n  return record;\n}\n`;
  },
  model: (s) => s.verdict,
};
