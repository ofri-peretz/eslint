const { tag } = require('../../lib.cjs');

let filename = 'src/app.ts';

module.exports = {
  domain: 162,
  traces: 1800,
  pkg: 'eslint-plugin-browser-security',
  rule: 'require-cookie-secure-attrs',
  get filename() {
    return filename;
  },
  key: (s) => `${tag(s.attrs)}|${tag(s.form)}|${tag(s.recv)}|${tag(s.ctx)}`,
  config: (s) =>
    tag(s.ctx) === 'TestFlipped' ? { allowInTests: false } : undefined,
  code: (s) => {
    filename = tag(s.ctx) === 'Prod' ? 'src/app.ts' : 'src/app.test.ts';
    const [name, suffix] = {
      NoAttrs: ['name', ''],
      SecureOnly: ['name', '; Secure'],
      SameSiteOnly: ['name', '; SameSite=Strict'],
      Both: ['name', '; Secure; SameSite=Strict'],
      BothLower: ['name', '; secure; samesite=lax'],
      NamedSecure: ['secure', '; SameSite=Lax'],
    }[tag(s.attrs)];
    const rhs = {
      Literal: `'${name}=value${suffix}'`,
      Template: `\`${name}=\${value}${suffix}\``,
      Concat: `'${name}=' + value + '${suffix}'`,
    }[tag(s.form)];
    const lhs = {
      Doc: 'document.cookie',
      WinDoc: 'window.document.cookie',
      Other: 'jar.cookie',
    }[tag(s.recv)];
    return [
      'declare const value: string;',
      'declare const jar: { cookie: string };',
      `${lhs} = ${rhs};`,
    ].join('\n');
  },
  model: (s) => s.verdict,
};
