const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  rule: 'require-validation-pipe-whitelist',
  // 12 opts x 2 forbid x 2 requireForbid x 3 callee x 2 site
  domain: 288,
  traces: 3500,
  key: (s) =>
    ['opts', 'forbid', 'requireForbid', 'callee', 'site']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => ({ requireForbidNonWhitelisted: s.requireForbid }),
  code: (s) => {
    const fb = s.forbid ? ', forbidNonWhitelisted: true' : '';
    const callee = tag(s.callee);
    const imp = {
      Plain:
        "import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';",
      Aliased:
        "import { Body, Controller, Post, UsePipes, ValidationPipe as VP } from '@nestjs/common';",
      Namespace:
        "import * as common from '@nestjs/common';\nimport { Body, Controller, Post, UsePipes } from '@nestjs/common';",
    }[callee];
    const ctor = {
      Plain: 'ValidationPipe',
      Aliased: 'VP',
      Namespace: 'common.ValidationPipe',
    }[callee];
    const pre = [];
    let arg;
    switch (tag(s.opts)) {
      case 'NoArg':
        arg = '';
        break;
      case 'EmptyObj':
        arg = `{ ${fb.slice(2)} }`;
        break;
      case 'TransformOnly':
        arg = `{ transform: true${fb} }`;
        break;
      case 'WlTrue':
        arg = `{ whitelist: true${fb} }`;
        break;
      case 'WlFalse':
        arg = `{ whitelist: false${fb} }`;
        break;
      case 'Spread':
        arg = `{ ...base${fb} }`;
        break;
      case 'SpreadWlFalse':
        arg = `{ ...base, whitelist: false${fb} }`;
        break;
      case 'Imported':
        arg = 'validationOptions';
        break;
      case 'LocalWlTrue':
        pre.push(`const pipeOpts = { whitelist: true${fb} };`);
        arg = 'pipeOpts';
        break;
      case 'LocalWlFalse':
        pre.push(`const pipeOpts = { transform: true${fb} };`);
        arg = 'pipeOpts';
        break;
      case 'LocalReassigned':
        pre.push(
          `let pipeOpts: any = { transform: true${fb} };`,
          'pipeOpts = validationOptions;',
        );
        arg = 'pipeOpts';
        break;
      case 'WlNonLiteral':
        arg = `{ whitelist: cfg.strip${fb} }`;
        break;
    }
    const pipe = `new ${ctor}(${arg})`;
    const head = [
      imp,
      "import validationOptions, { base, cfg } from './validation-options';",
      ...pre,
    ].join('\n');
    if (tag(s.site) === 'GlobalPipes')
      return `${head}\nexport function setup(app: any) {\n  app.useGlobalPipes(${pipe});\n}\n`;
    return `${head}\n@Controller('users')\nexport class UsersController {\n  @Post()\n  @UsePipes(${pipe})\n  create(@Body() dto: CreateUserDto) { return dto; }\n}\n`;
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
