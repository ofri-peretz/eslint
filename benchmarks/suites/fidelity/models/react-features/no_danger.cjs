const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, api, src } = require('../../react.cjs');

const SPELLING = {
  CeNamed: 'Named',
  CeDefault: 'Default',
  CeComputed: 'Computed',
  CeShadowed: 'Shadowed',
};

module.exports = {
  rule: 'no-danger',
  domain: 5 * 4,
  traces: 400,
  filename: FILE,
  key: keyOf('form', 'prop'),
  code: (s) => {
    const f = tag(s.form);
    const p = tag(s.prop);
    if (f === 'Jsx') {
      const attr = {
        Present: ' dangerouslySetInnerHTML={{ __html: html }}',
        QuotedKey: ' dangerouslySetInnerHTML={{ "__html": html }}',
        Absent: '',
        Lowercase: ' dangerouslysetinnerhtml={html}',
      }[p];
      return src(
        'export function App({ html }: any) {',
        `  return <div className="body"${attr} />;`,
        '}',
      );
    }
    const { pre, ref } = api(SPELLING[f], 'createElement');
    const props = {
      Present:
        '{ className: "body", dangerouslySetInnerHTML: { __html: html } }',
      QuotedKey:
        '{ className: "body", "dangerouslySetInnerHTML": { __html: html } }',
      Absent: '{ className: "body" }',
      Lowercase: '{ className: "body", dangerouslysetinnerhtml: html }',
    }[p];
    return src(
      pre,
      'export function App({ html }: any) {',
      `  return ${ref}('div', ${props});`,
      '}',
    );
  },
};
