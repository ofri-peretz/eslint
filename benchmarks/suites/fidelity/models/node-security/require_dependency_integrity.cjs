const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'require-dependency-integrity',
  domain: 48, // 6 tag kinds x 4 hosts x integrity present/absent
  traces: 600,
  filename: 'src/page.tsx',
  key: (s) => `${tag(s.tagKind)}|${tag(s.host)}|integrity=${s.hasIntegrity}`,
  code: (s) => {
    const url = {
      Cdnjs:
        'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js',
      Unpkg: 'https://unpkg.com/bootstrap@5.1.3/dist/js/bootstrap.min.js',
      Jsdelivr: 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js',
      SelfHosted: '/static/vendor/jquery.min.js',
    }[tag(s.host)];
    const css = url.replace(/\.js$/, '.css');
    const sri = s.hasIntegrity
      ? ' integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous"'
      : '';
    const jsxSri = s.hasIntegrity
      ? ' integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossOrigin="anonymous"'
      : '';
    return {
      ScriptStr: `export const tag = '<script src="${url}"${sri}></script>';\n`,
      LinkStr: `export const tag = '<link rel="stylesheet" href="${css}"${sri}>';\n`,
      ScriptTemplate: `export const tag = \`<script src="${url}"${sri}></script>\`;\n`,
      ScriptJsx: `export const Head = () => <script src="${url}"${jsxSri} />;\n`,
      LinkJsx: `export const Head = () => <link rel="stylesheet" href="${css}"${jsxSri} />;\n`,
      PlainUrl: `export const VERSION_FEED = '${url}${s.hasIntegrity ? '?v=1' : ''}';\n`,
    }[tag(s.tagKind)];
  },
  model: (s) => s.verdict,
};
