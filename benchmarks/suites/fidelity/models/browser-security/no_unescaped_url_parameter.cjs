const { tag } = require('../../lib.cjs');

let current = null;

// [preamble, wrapper kind, interpolated expression]
// wrapper: 'module' -> the URL is built at module level;
//          'exported' / 'private' -> inside a function taking `term`.
const SOURCES = {
  UrlParamVar: [
    "const q = new URLSearchParams(location.search).get('q');",
    'module',
    'q',
  ],
  LocHash: ['', 'module', 'location.hash'],
  Referrer: ['', 'module', 'document.referrer'],
  DomField: [
    "const field = document.getElementById('site-search');",
    'module',
    'field.value',
  ],
  ExportedParam: ['', 'exported:term: string', 'term'],
  PrivateParam: ['', 'private:term: string', 'term'],
  Encoded: [
    "const q = new URLSearchParams(location.search).get('q');",
    'module',
    'encodeURIComponent(q)',
  ],
  ArithExported: ['', 'exported:term', 'term + 1'],
  ClosedSetExported: ['', "exported:term: 'asc' | 'desc'", 'term'],
  NumberExported: ['', 'exported:term: number', 'term'],
  LocOrigin: ['', 'module', 'location.origin'],
  StaticConst: ["const PARAM = 'static';", 'module', 'PARAM'],
};

function urlExpr(pos, e) {
  return {
    Query: `\`https://api.example.com/v1/search?q=\${${e}}\``,
    Path: `\`https://docs.example.com/v2/pages/\${${e}}/content\``,
    Fragment: `\`https://docs.example.com/v2/page#\${${e}}\``,
    ConcatQuery: `'https://internal.example.com/v1/report?filter=' + (${e})`,
    Host: `\`https://\${${e}}/v1/status\``,
    RelativeNoSink: `\`/api/v1/pages?slug=\${${e}}\``,
    RelativeFetch: `\`/api/v1/pages?slug=\${${e}}\``,
  }[pos];
}

module.exports = {
  domain: 336, // 12 sources x 7 positions x test file x allowInTests
  traces: 4500,
  rule: 'no-unescaped-url-parameter',
  key: (s) =>
    `${tag(s.source)}|${tag(s.position)}|test=${s.testFile}|allow=${s.allowInTests}`,
  config: (s) => ({ allowInTests: s.allowInTests }),
  get filename() {
    return current && current.testFile ? 'src/search.test.ts' : 'src/search.ts';
  },
  code: (s) => {
    current = s;
    const [pre, wrap, e] = SOURCES[tag(s.source)];
    const pos = tag(s.position);
    const u = urlExpr(pos, e);
    const use = pos === 'RelativeFetch' ? `fetch(${u})` : u;
    let body;
    if (wrap === 'module') {
      body = pos === 'RelativeFetch' ? `${use};` : `const url = ${use};`;
    } else {
      const [kind, param] = wrap.split(/:(.*)/s);
      const exp = kind === 'exported' ? 'export ' : '';
      body = `${exp}function build(${param}) {\n  return ${use};\n}`;
    }
    return `${pre}\n${body}\n`;
  },
  model: (s) => s.verdict,
};
