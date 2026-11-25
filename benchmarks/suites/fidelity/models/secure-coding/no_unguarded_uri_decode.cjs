const { tag } = require('../../lib.cjs');

// Each argument shape: [statements before the call, the argument expression].
const ARG = {
  ReqParams: ['', 'req.params.name'],
  ReqQueryFallback: ['', "req.query.q || ''"],
  ReqUrlSplit: ['', "req.url.split('?')[0]"],
  Destructured: ['const { name } = req.params;', 'name'],
  KoaPath: ['', 'ctx.path'],
  LocationHash: ['', 'location.hash.slice(1)'],
  DocCookie: ['', 'document.cookie'],
  UrlPathname: ['', "new URL(req.url, 'http://x').pathname"],
  SearchParamsGet: ['', "new URL(req.url, 'http://x').searchParams.get('q')"],
  EnvPassword: ['', 'new URL(process.env.HTTP_PROXY).password'],
  FnParam: ['', 'value'],
  Converted: ['', 'Number(req.params.id)'],
  ValidLiteral: ['', "'a%20b'"],
  MalformedLiteral: ['', "'p%ss'"],
  Shadowed: ['', 'req.params.name'],
};

module.exports = {
  rule: 'no-unguarded-uri-decode',
  domain: 120, // 15 argument shapes x 4 guards x 2 decoders
  traces: 900,
  key: (s) => `${tag(s.arg)}|${tag(s.guard)}|${tag(s.decoder)}`,
  config: () => undefined,
  code: (s) => {
    const arg = tag(s.arg);
    const [pre, expr] = ARG[arg];
    const fn =
      tag(s.decoder) === 'Component' ? 'decodeURIComponent' : 'decodeURI';
    const call = `${fn}(${expr})`;
    const shadow =
      arg === 'Shadowed'
        ? 'function decodeURIComponent(x) { return x; }\nfunction decodeURI(x) { return x; }\n'
        : '';
    const params = '(req, ctx, value)';
    const body = {
      NoGuard: `function h${params} {\n  ${pre}\n  return ${call};\n}`,
      TryCatch: `function h${params} {\n  ${pre}\n  try {\n    return ${call};\n  } catch {\n    return null;\n  }\n}`,
      TryFinally: `function h${params} {\n  ${pre}\n  try {\n    return ${call};\n  } finally {\n    done();\n  }\n}`,
      OuterTry: `function mount(app) {\n  try {\n    app.get('/x', ${params} => {\n      ${pre}\n      return ${call};\n    });\n  } catch {\n    log();\n  }\n}`,
    }[tag(s.guard)];
    return `${shadow}${body}\nexport { };\n`;
  },
};
