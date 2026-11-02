const { tag } = require('../../lib.cjs');

let current = null;

const mw = (body) =>
  `app.use((req: any, res: any, next: any) => {\n  ${body}\n  next();\n});`;

module.exports = {
  domain: 96, // 12 configs x test file x allowInTests x trustedLibraries
  traces: 1500,
  rule: 'no-missing-cors-check',
  key: (s) =>
    `${tag(s.cfg)}|test=${s.testFile}|allow=${s.allowInTests}|trusted=${s.trusted}`,
  config: (s) => ({
    allowInTests: s.allowInTests,
    trustedLibraries: s.trusted ? ['cors'] : [],
  }),
  get filename() {
    return current && current.testFile ? 'src/server.test.ts' : 'src/server.ts';
  },
  code: (s) => {
    current = s;
    const stmt = {
      CorsWildcard: "app.use(cors({ origin: '*', credentials: true }));",
      CorsNoOrigin: 'app.use(cors({ credentials: true }));',
      CorsNoArgs: 'app.use(cors());',
      CorsOriginTrue: 'app.use(cors({ origin: true, credentials: true }));',
      CorsOriginArray:
        'app.use(cors({ origin: allowedOrigins, credentials: true }));',
      CorsOriginFn:
        "app.use(cors({\n  origin: (origin: any, callback: any) => {\n    if (!origin || allowedOrigins.includes(origin)) callback(null, true);\n    else callback(new Error('Not allowed by CORS'));\n  },\n  credentials: true,\n}));",
      CorsOriginLiteral:
        "app.use(cors({ origin: 'https://example.com', credentials: true }));",
      HeaderWildcard: mw("res.setHeader('Access-Control-Allow-Origin', '*');"),
      HeaderWildcardLower: mw(
        "res.setHeader('access-control-allow-origin', '*');",
      ),
      ResHeaderWildcard: mw("res.header('Access-Control-Allow-Origin', '*');"),
      HeaderReflectUnchecked: mw(
        "res.setHeader('Access-Control-Allow-Origin', req.headers.origin);",
      ),
      HeaderValidated: mw(
        "const origin = req.headers.origin;\n  if (allowedOrigins.includes(origin)) {\n    res.setHeader('Access-Control-Allow-Origin', origin);\n  }",
      ),
    }[tag(s.cfg)];
    return `import express from 'express';\nimport cors from 'cors';\nconst app = express();\nconst allowedOrigins = ['https://example.com', 'https://app.example.com'];\n${stmt}\n`;
  },
  model: (s) => s.verdict,
};
