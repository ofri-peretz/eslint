const { tag, withTestFile } = require('../../lib.cjs');

const SECOND = {
  NoSecondArg: '',
  EmptyObj: ', {}',
  OtherKeyOnly: ', { foo: 1 }',
  InheritTrue: ', { inheritAppConfig: true }',
  InheritFalse: ', { inheritAppConfig: false }',
  SpreadOnly: ', { ...hybridOptions }',
  SpreadThenFalse: ', { ...hybridOptions, inheritAppConfig: false }',
  FalseThenSpread: ', { inheritAppConfig: false, ...hybridOptions }',
  ExternalVar: ', hybridOptions',
  NonLiteral: ', { inheritAppConfig: config.inherit }',
};

const base = {
  rule: 'no-hybrid-app-config-loss',
  domain: 80, // 10 hybrid options x 4 receivers x 2 generic
  traces: 1000,
  key: (s) =>
    `hybrid=${tag(s.hybrid)} receiver=${tag(s.receiver)} generic=${s.generic}`,
  config: () => ({}),
  code: (s) => {
    const ta = s.generic ? '<MicroserviceOptions>' : '';
    const args = `(kafkaConfig${SECOND[tag(s.hybrid)]})`;
    const head = [
      "import { NestFactory } from '@nestjs/core';",
      "import { MicroserviceOptions } from '@nestjs/microservices';",
      "import { AppModule } from './app.module';",
      "import { kafkaConfig, hybridOptions, config } from './config';",
    ].join('\n');
    const r = tag(s.receiver);
    if (r === 'ThisInFramework')
      return `${head}\nexport class NestApplication {\n  connectMicroservice(o: any, h?: any) { return o; }\n  connect() {\n    return this.connectMicroservice${ta}${args};\n  }\n}\n`;
    const call = {
      AppDot: `app.connectMicroservice${ta}${args}`,
      AppBracket: `app['connectMicroservice']${ta}${args}`,
      AppOptional: `app?.connectMicroservice${ta}${args}`,
    }[r];
    return `${head}\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  ${call};\n  await app.startAllMicroservices();\n  await app.listen(3000);\n}\nbootstrap();\n`;
  },
  filename: 'src/main.ts',
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
