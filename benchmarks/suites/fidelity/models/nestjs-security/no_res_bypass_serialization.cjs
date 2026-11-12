const { tag, withTestFile } = require('../../lib.cjs');

const DECO = {
  NoRes: '',
  Res: '@Res() ',
  ResponseAlias: '@Response() ',
  ResPassthrough: '@Res({ passthrough: true }) ',
  ResPassthroughFalse: '@Res({ passthrough: false }) ',
};
const WRITE = {
  JsonObj: 'res.json(user);',
  SendObj: 'res.send(user);',
  StatusJson: 'res.status(200).json(user);',
  SendString: "res.status(200).send('ok');",
  SendFile: 'res.sendFile(user.avatarPath);',
  Redirect: 'res.redirect(user.homepage);',
  HandOff: 'return this.usersService.stream(res);',
  NoWrite: 'return user;',
};
const RETURNED = {
  Value: 'return user;',
  WebJson: 'return Response.json(user);',
  WebJsonEmpty: 'return Response.json({});',
  WebRedirect: 'return Response.redirect(user.homepage);',
  ShadowedJson: 'return Response.json(user);',
};

const base = {
  rule: 'no-res-bypass-serialization',
  // (4 response decorators x 8 writes + 5 returns with none) x 5 serializers
  // x 2 assume
  domain: 370,
  traces: 6000,
  key: (s) =>
    ['resDeco', 'write', 'returned', 'serializer', 'assumeGlobal']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => ({ assumeGlobalSerializer: s.assumeGlobal }),
  code: (s) => {
    const ser = tag(s.serializer);
    const deco = tag(s.resDeco);
    const params = [
      "@Param('id') id: string",
      deco !== 'NoRes' ? `${DECO[deco]}res: any` : '',
    ]
      .filter(Boolean)
      .join(', ');
    const returned = tag(s.returned);
    const write = deco === 'NoRes' ? RETURNED[returned] : WRITE[tag(s.write)];
    // `Response` is Nest's decorator alias when imported; left out, the name
    // is the global web Response.
    const response =
      deco === 'ResponseAlias' || returned === 'ShadowedJson'
        ? ' Response,'
        : '';
    return [
      `import { ClassSerializerInterceptor, Controller, Get, Param, Res,${response} SerializeOptions, StandardSchemaSerializerInterceptor, UseInterceptors } from '@nestjs/common';`,
      "@Controller('users')",
      ser === 'ClassInterceptor'
        ? '@UseInterceptors(ClassSerializerInterceptor)'
        : '',
      ser === 'SchemaInterceptor'
        ? '@UseInterceptors(StandardSchemaSerializerInterceptor)'
        : '',
      'export class UsersController {',
      '  constructor(private readonly usersService: any) {}',
      "  @Get(':id')",
      ser === 'MethodInterceptor'
        ? '  @UseInterceptors(ClassSerializerInterceptor)'
        : '',
      ser === 'SerializeOpts'
        ? "  @SerializeOptions({ groups: ['public'] })"
        : '',
      `  async findOne(${params}) {`,
      '    const user = await this.usersService.findOne(id);',
      `    ${write}`,
      '  }',
      '}',
      '',
    ]
      .filter((l) => l !== '')
      .join('\n');
  },
  filename: 'src/users.controller.ts',
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
