const { tag, withTestFile } = require('../../lib.cjs');

const TYPES = {
  DtoClass: ': CreateUserDto',
  AnyT: ': any',
  UnknownT: ': unknown',
  ObjectT: ': object',
  InlineLiteral: ': { name: string }',
  NoAnnotation: '',
};

const base = {
  rule: 'no-missing-validation-pipe',
  // route: 2 deco x (6 types without a schema + 2 with) x 9 pipes x 2 global
  // x 2 explicit + NoDeco x 9 pipes; not a route: 1
  domain: 576 + 9 + 1,
  traces: 16000,
  key: (s) =>
    [
      'route',
      'deco',
      'paramType',
      'pipe',
      'schema',
      'globalPipe',
      'requireExplicit',
    ]
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => ({
    detectGlobalPipes: false,
    assumeGlobalPipes: s.globalPipe,
    requireExplicitPipe: s.requireExplicit,
  }),
  code: (s) => {
    const pipe = tag(s.pipe);
    const deco = tag(s.deco);
    const pipeArg = [
      s.schema ? '{ schema: createUserSchema }' : '',
      pipe === 'ParamPipe' ? 'new ValidationPipe()' : '',
      pipe === 'SchemaParam' ? 'new StandardSchemaValidationPipe()' : '',
    ]
      .filter(Boolean)
      .join(', ');
    const paramDeco =
      deco === 'BodyDeco'
        ? `@Body(${pipeArg}) `
        : deco === 'QueryDeco'
          ? `@Query(${pipeArg}) `
          : '';
    const methodDecos = [
      s.route ? '@Post()' : '',
      pipe === 'HandlerNew' ? '@UsePipes(new ValidationPipe())' : '',
      pipe === 'HandlerRef' ? '@UsePipes(ValidationPipe)' : '',
      pipe === 'OtherPipe' ? '@UsePipes(new ParseIntPipe())' : '',
      pipe === 'SchemaHandler'
        ? '@UsePipes(new StandardSchemaValidationPipe())'
        : '',
    ].filter(Boolean);
    const classDecos = [
      "@Controller('users')",
      pipe === 'ClassLevel' ? '@UsePipes(new ValidationPipe())' : '',
      pipe === 'SchemaClass' ? '@UsePipes(StandardSchemaValidationPipe)' : '',
    ]
      .filter(Boolean)
      .join('\n');
    return [
      "import { Body, Controller, ParseIntPipe, Post, Query, StandardSchemaValidationPipe, UsePipes, ValidationPipe } from '@nestjs/common';",
      "import { CreateUserDto, createUserSchema } from './create-user.dto';",
      classDecos,
      'export class UsersController {',
      ...methodDecos.map((d) => `  ${d}`),
      `  create(${paramDeco}dto${TYPES[tag(s.paramType)]}) { return dto; }`,
      '}',
      '',
    ].join('\n');
  },
  filename: 'src/users.controller.ts',
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
