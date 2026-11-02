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

const base = {
  rule: 'no-res-bypass-serialization',
  domain: 320, // 5 decorators x 8 writes x 4 serializers x 2 assume
  traces: 4000,
  key: (s) =>
    ['resDeco', 'write', 'serializer', 'assumeGlobal']
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
    const write = deco === 'NoRes' ? 'return user;' : WRITE[tag(s.write)];
    return [
      "import { ClassSerializerInterceptor, Controller, Get, Param, Res, Response, SerializeOptions, UseInterceptors } from '@nestjs/common';",
      "@Controller('users')",
      ser === 'ClassInterceptor'
        ? '@UseInterceptors(ClassSerializerInterceptor)'
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
