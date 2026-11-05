const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

/** [basename, name without extension, the allowed<Case>Case list it is in]. */
const NAME = {
  Kebab: ['user-service.ts', 'user-service', 'allowedKebabCase'],
  Camel: ['userService.ts', 'userService', 'allowedCamelCase'],
  Pascal: ['UserService.ts', 'UserService', 'allowedPascalCase'],
  Snake: ['user_service.ts', 'user_service', 'allowedSnakeCase'],
  Single: ['user.ts', 'user', 'allowedKebabCase'],
  Upper: ['README.ts', 'README', 'allowedPascalCase'],
  TestSuffix: ['user-service.test.ts', 'user-service', 'allowedKebabCase'],
  Dotfile: ['.eslintrc.ts', '.eslintrc', 'allowedKebabCase'],
};

const CASE = {
  KebabCase: 'kebabCase',
  CamelCase: 'camelCase',
  PascalCase: 'pascalCase',
  SnakeCase: 'snakeCase',
};

module.exports = {
  rule: 'filename-case',
  domain: 8 * 4 * 4,
  traces: 700,
  key: keyOf('name', 'fileCase', 'override'),
  filename: (s) => `src/${NAME[tag(s.name)][0]}`,
  config: (s) => {
    const [base, bare, list] = NAME[tag(s.name)];
    // kebabCase is the default: leave `case` unset for it.
    const c = tag(s.fileCase);
    const opts = c === 'KebabCase' ? {} : { case: CASE[c] };
    const o = tag(s.override);
    if (o === 'AllowListed') opts[list] = [bare];
    if (o === 'Ignored') opts.ignore = [base];
    if (o === 'UppercaseOff') opts.allowedUppercaseFiles = [];
    return Object.keys(opts).length ? opts : undefined;
  },
  code: () => src('export const ready = true;'),
};
