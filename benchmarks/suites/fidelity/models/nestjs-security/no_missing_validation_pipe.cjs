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
  // route: 2 deco x 6 types x 6 pipes x 2 global x 2 explicit + NoDeco x 6 pipes;
  // not a route: 1
  domain: 288 + 6 + 1,
  traces: 4000,
  key: (s) =>
    ['route', 'deco', 'paramType', 'pipe', 'globalPipe', 'requireExplicit']
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
    const pipeArg = pipe === 'ParamPipe' ? 'new ValidationPipe()' : '';
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
    ].filter(Boolean);
    const classDecos = [
      "@Controller('users')",
      pipe === 'ClassLevel' ? '@UsePipes(new ValidationPipe())' : '',
    ]
      .filter(Boolean)
      .join('\n');
    return [
      "import { Body, Controller, ParseIntPipe, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';",
      "import { CreateUserDto } from './create-user.dto';",
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
