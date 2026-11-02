const { tag, withTestFile } = require('../../lib.cjs');

const ARGS = {
  NoArg: '',
  EmptyObj: '{}',
  CredOnly: '{ credentials: true }',
  OriginStar: "{ origin: '*' }",
  OriginTrue: '{ origin: true }',
  OriginTrueCred: '{ origin: true, credentials: true }',
  OriginFalse: '{ origin: false }',
  OriginString: "{ origin: 'https://app.example.com' }",
  OriginArray: "{ origin: ['https://app.example.com'] }",
  OriginMember: "{ origin: configService.get('cors.origin') }",
  OriginCallback: '{ origin: (o, cb) => cb(null, allowed.includes(o)) }',
  OriginRegex: '{ origin: /\\.example\\.com$/ }',
  OriginTemplate: '{ origin: `https://${host}` }',
  SpreadOnly: '{ ...base }',
  SpreadThenStar: "{ ...base, origin: '*' }",
  ImportedOpts: 'corsOptions',
  LocalStar: 'localOpts',
  LocalList: 'localOpts',
  LocalReassigned: 'localOpts',
};
const PRE = {
  LocalStar: "const localOpts = { origin: '*' };",
  LocalList: "const localOpts = { origin: ['https://app.example.com'] };",
  LocalReassigned:
    "let localOpts: any = { origin: '*' };\nlocalOpts = corsOptions;",
};

const GUARD = {
  Unguarded: (c) => [`${c};`],
  IfDev: (c) => [
    "if (process.env.NODE_ENV === 'development') {",
    `  ${c};`,
    '}',
  ],
  IfNotProd: (c) => [
    "if (process.env.NODE_ENV !== 'production') {",
    `  ${c};`,
    '}',
  ],
  IfProd: (c) => [
    "if (process.env.NODE_ENV === 'production') {",
    `  ${c};`,
    '}',
  ],
  ElseOfDev: (c) => [
    "if (process.env.NODE_ENV === 'development') {",
    '  app.useLogger(logger);',
    '} else {',
    `  ${c};`,
    '}',
  ],
  ElseOfProd: (c) => [
    "if (process.env.NODE_ENV === 'production') {",
    '  app.useLogger(logger);',
    '} else {',
    `  ${c};`,
    '}',
  ],
  AndIsDev: (c) => [`isDev && ${c};`],
  StageLocal: (c) => ["if (stage === 'local') {", `  ${c};`, '}'],
  NonEnvCond: (c) => [
    "if (publicPath.startsWith('/public')) {",
    `  ${c};`,
    '}',
  ],
};

const base = {
  rule: 'no-permissive-cors',
  // 17 args x 2 callees unguarded + 2 args x 2 callees x 9 guards x 2 hints
  domain: 34 + 72,
  traces: 3000,
  key: (s) =>
    ['arg', 'callee', 'guard', 'hints']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    tag(s.hints) === 'StageHints' ? { environmentHintNames: ['stage'] } : {},
  code: (s) => {
    const a = tag(s.arg);
    const call =
      tag(s.callee) === 'Dot' ? 'app.enableCors' : "app['enableCors']";
    return [
      "import { NestFactory } from '@nestjs/core';",
      "import { AppModule } from './app.module';",
      "import { corsOptions, base, configService, allowed, host, isDev, stage, publicPath, logger } from './config';",
      PRE[a] ?? '',
      'async function bootstrap() {',
      '  const app = await NestFactory.create(AppModule);',
      ...GUARD[tag(s.guard)](`${call}(${ARGS[a]})`).map((l) => `  ${l}`),
      '  await app.listen(3000);',
      '}',
      'bootstrap();',
      '',
    ].join('\n');
  },
  filename: 'src/main.ts',
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
