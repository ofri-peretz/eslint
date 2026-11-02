const { tag, withTestFile } = require('../../lib.cjs');

const NAMES = {
  Password: 'password',
  HashedPassword: 'hashedPassword',
  PasswordChangedAt: 'passwordChangedAt',
  AccessToken: 'accessToken',
  ApiKey: 'apiKey',
  Ssn: 'ssn',
  Email: 'email',
  CustomTerm: 'favoriteColor',
};
const FIELD_DECO = {
  NoExclude: '',
  Exclude: '@Exclude()',
  ExcludeToPlainOnly: '@Exclude({ toPlainOnly: true })',
  ExcludeToClassOnly: '@Exclude({ toClassOnly: true })',
  ClassExclude: '',
  OtherDecorator: '@IsString()',
};

const base = {
  rule: 'no-exposed-private-fields',
  domain: 324, // 3 kinds x (7 fields + custom term x 2 custom) x 6 exclusions x 2 nestImport
  traces: 3000,
  key: (s) =>
    ['kind', 'fieldName', 'exclusion', 'nestImport', 'custom']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => ({ sensitivePatterns: s.custom ? ['favoriteColor'] : [] }),
  code: (s) => {
    const kind = tag(s.kind);
    const ex = tag(s.exclusion);
    const classDecos = [
      kind === 'EntityClass' ? '@Entity()' : '',
      ex === 'ClassExclude' ? '@Exclude()' : '',
    ].filter(Boolean);
    const name = {
      EntityClass: 'User',
      ResponseDto: 'UserResponseDto',
      PlainClass: 'PasswordHasher',
    }[kind];
    return [
      s.nestImport ? "import { ApiProperty } from '@nestjs/swagger';" : '',
      "import { Entity } from 'typeorm';",
      "import { Exclude, Expose } from 'class-transformer';",
      "import { IsString } from 'class-validator';",
      ...classDecos,
      `export class ${name} {`,
      ex === 'ClassExclude' ? '  @Expose()\n  id: string;' : '  id: string;',
      FIELD_DECO[ex] ? `  ${FIELD_DECO[ex]}` : '',
      `  ${NAMES[tag(s.fieldName)]}: string;`,
      '}',
      '',
    ]
      .filter((l) => l !== '')
      .join('\n');
  },
  filename: 'src/user.entity.ts',
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
