const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  rule: 'no-unguarded-swagger',
  domain: 120, // 2 ctx x 5 guards x 2 calls x 3 spellings x 2 forms
  traces: 1500,
  key: (s) =>
    ['ctx', 'guard', 'call', 'spelling', 'form']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: () => ({}),
  code: (s) => {
    const sp = tag(s.spelling);
    const mod = sp === 'AliasedImport' ? 'SM' : 'SwaggerModule';
    const imp =
      sp === 'AliasedImport'
        ? "import { SwaggerModule as SM, DocumentBuilder } from '@nestjs/swagger';"
        : "import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';";
    const setup =
      tag(s.call) === 'Setup'
        ? sp === 'BracketCall'
          ? `${mod}['setup']('docs', app, document)`
          : `${mod}.setup('docs', app, document)`
        : 'void document';
    const doc = `const document = ${mod}.createDocument(app, new DocumentBuilder().build());`;
    const body = {
      NoGuard: [doc, `${setup};`],
      IfBlock: ['if (cfg.swaggerEnabled) {', `  ${doc}`, `  ${setup};`, '}'],
      LogicalAnd: [doc, `cfg.swaggerEnabled && ${setup};`],
      Ternary: [doc, `cfg.swaggerEnabled ? ${setup} : undefined;`],
      TryBlock: [
        'try {',
        `  ${doc}`,
        `  ${setup};`,
        '} catch (e) {',
        '  console.error(e);',
        '}',
      ],
    }[tag(s.guard)];
    const boot = tag(s.ctx) === 'Bootstrap';
    const lines = [
      ...(boot ? ['const app = await NestFactory.create(AppModule);'] : []),
      ...body,
      ...(boot ? ['await app.listen(3000);'] : []),
    ].map((l) => `  ${l}`);
    const name = boot ? 'bootstrap' : 'setupSwagger';
    const params = boot ? '' : 'app: INestApplication';
    const fn =
      tag(s.form) === 'FuncDecl'
        ? `export async function ${name}(${params}) {\n${lines.join('\n')}\n}`
        : `export const ${name} = async (${params}) => {\n${lines.join('\n')}\n};`;
    return [
      "import { INestApplication } from '@nestjs/common';",
      "import { NestFactory } from '@nestjs/core';",
      imp,
      "import { AppModule } from './app.module';",
      "import { cfg } from './config';",
      fn,
      '',
    ].join('\n');
  },
  filename: 'src/main.ts',
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
