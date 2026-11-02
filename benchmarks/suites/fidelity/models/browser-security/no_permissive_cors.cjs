const { tag } = require('../../lib.cjs');

const mw = (body) =>
  `app.use((req: any, res: any, next: any) => {\n  ${body}\n  next();\n});`;

module.exports = {
  domain: 24, // 8 configs x 3 import styles
  traces: 500,
  rule: 'no-permissive-cors',
  key: (s) => `${tag(s.cfg)}|${tag(s.imp)}`,
  config: () => undefined,
  code: (s) => {
    const name = tag(s.imp) === 'ImportRenamed' ? 'corsMiddleware' : 'cors';
    const imp = {
      Require: "const cors = require('cors');",
      ImportDefault: "import cors from 'cors';",
      ImportRenamed: "import corsMiddleware from 'cors';",
    }[tag(s.imp)];
    const stmt = {
      CorsWildcard: `app.use(${name}({ origin: '*' }));`,
      CorsLiteral: `app.use(${name}({ origin: 'https://trusted.example.com' }));`,
      CorsFn: `app.use(${name}({\n  origin: function (origin: any, callback: any) {\n    if (whiteList.indexOf(origin) !== -1 || !origin) callback(null, true);\n    else callback(new Error('Not allowed by CORS'));\n  },\n}));`,
      HeaderWildcard: mw("res.setHeader('Access-Control-Allow-Origin', '*');"),
      HeaderWildcardLower: mw(
        "res.setHeader('access-control-allow-origin', '*');",
      ),
      ResHeaderWildcard: mw("res.header('Access-Control-Allow-Origin', '*');"),
      ResSetWildcard: mw("res.set('Access-Control-Allow-Origin', '*');"),
      HeaderSpecific: mw(
        "res.setHeader('Access-Control-Allow-Origin', 'https://trusted.example.com');",
      ),
    }[tag(s.cfg)];
    return `${imp}\ndeclare const app: any;\nconst whiteList = ['https://app.example.com'];\n${stmt}\n`;
  },
  model: (s) => s.verdict,
};
