const { tag } = require('../../lib.cjs');

let current = null;

module.exports = {
  domain: 384, // 2^3 header subsets x 3 extras x 4 spellings x option x test file
  traces: 5000,
  rule: 'no-missing-security-headers',
  key: (s) =>
    `csp=${s.csp}|xfo=${s.xfo}|xcto=${s.xcto}|${tag(s.extra)}|${tag(s.spelling)}|xfoOnly=${s.customXfoOnly}|test=${s.testFile}`,
  config: (s) =>
    s.customXfoOnly ? { requiredHeaders: ['X-Frame-Options'] } : undefined,
  get filename() {
    return current && current.testFile ? 'src/server.test.ts' : 'src/server.ts';
  },
  code: (s) => {
    current = s;
    const sp = tag(s.spelling);
    const set = (name, value) => {
      const n = sp === 'SetHeaderLower' ? name.toLowerCase() : name;
      const fn = {
        SetHeaderCanon: 'setHeader',
        SetHeaderLower: 'setHeader',
        ResSetCanon: 'set',
        ResHeaderCanon: 'header',
      }[sp];
      return `res.${fn}('${n}', "${value}");`;
    };
    const lines = [];
    if (s.csp) lines.push(set('Content-Security-Policy', "default-src 'self'"));
    if (s.xfo) lines.push(set('X-Frame-Options', 'DENY'));
    if (s.xcto) lines.push(set('X-Content-Type-Options', 'nosniff'));
    if (tag(s.extra) === 'ContentType')
      lines.push(set('Content-Type', 'text/html; charset=utf-8'));
    if (tag(s.extra) === 'CacheControl')
      lines.push(set('Cache-Control', 'no-store'));
    lines.push('res.send(page);');
    return `declare const app: any;\ndeclare const page: string;\napp.get('/', (req: any, res: any) => {\n  ${lines.join('\n  ')}\n});\n`;
  },
  model: (s) => s.verdict,
};
