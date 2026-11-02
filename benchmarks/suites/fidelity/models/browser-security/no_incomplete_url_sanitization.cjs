const { tag } = require('../../lib.cjs');

const RECV = {
  UrlName: 'url',
  HostName: 'hostname',
  Opaque: 'value',
  Target: 'target',
  LocationHref: 'location.href',
};

module.exports = {
  domain: 110, // 11 checks x 5 receivers x 2 option values
  traces: 1500,
  rule: 'no-incomplete-url-sanitization',
  key: (s) => `${tag(s.check)}|${tag(s.recv)}|custom=${s.custom}`,
  config: (s) => (s.custom ? { urlNameWords: ['target'] } : undefined),
  code: (s) => {
    const r = RECV[tag(s.recv)];
    const body = {
      Includes: `return ${r}.includes('trusted.com');`,
      ComputedIncludes: `return ${r}['includes']('trusted.com');`,
      IndexOfNeq: `return ${r}.indexOf('trusted.com') !== -1;`,
      IndexOfGe: `return ${r}.indexOf('trusted.com') >= 0;`,
      LastIndexOfNeq: `return ${r}.lastIndexOf('.trusted.com') !== -1;`,
      LastIndexOfSuffix: `const needle = '.trusted.com';\n  return ${r}.lastIndexOf(needle) === ${r}.length - needle.length;`,
      IncludesNonHost: `return ${r}.includes('?');`,
      HostEq: `return ${r} === 'trusted.com';`,
      SchemeOnlyJs: `const lowered = String(${r}).trim().toLowerCase();\n  if (lowered.startsWith('javascript:')) return '#';\n  return ${r};`,
      SchemeComplete: `const lowered = String(${r}).trim().toLowerCase();\n  if (lowered.startsWith('javascript:') || lowered.startsWith('data:') || lowered.startsWith('vbscript:')) return '#';\n  return ${r};`,
      SchemeAllowlist: `const parsed = new URL(${r}, window.location.origin);\n  return ['http:', 'https:'].indexOf(parsed.protocol) !== -1 ? parsed.href : '#';`,
    }[tag(s.check)];
    return `export function check(url: string, hostname: string, value: string, target: string) {\n  ${body}\n}\n`;
  },
  model: (s) => s.verdict,
};
