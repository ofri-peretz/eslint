/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock: no rule in this plugin reports in a file that does not use
 * NestJS.
 *
 * Measured over 107,382 files across 107 repositories, **22% of everything this
 * plugin reported (219 of 999 findings) was in a file importing no NestJS
 * package** — the rules key on decorator and method names that Angular, TypeORM
 * and plain TypeScript classes share.
 *
 * Written over the whole rule registry rather than per rule, so a rule added
 * later is covered the day it lands: it will fail here until it is gated too.
 * Revert the gate in any single rule and this test goes red.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import plugin from './index';

const RULES = Object.keys(plugin.rules);

/** The SDK import that is the whole difference between the two halves below. */
const SDK = "import '@nestjs/common';";

/**
 * A real violation of `no-exposed-private-fields`. It appears twice on purpose: once
 * without the import (must be silent) and once with it (must report). One
 * fixture proving both directions is what stops this suite passing with the
 * gate shut on everything.
 */
const VIOLATION = `@Entity()
     class ApiKeyToken {
       @Column()
       apiSecret: string;
     }`;

/** A violation of every rule, keyed by rule name; each is that rule's doc ❌ example. */
const RULE_VIOLATIONS: Readonly<Record<string, string>> = {
  'no-exposed-private-fields': VIOLATION,
  'no-hybrid-app-config-loss': `async function bootstrap() {
       const app = await NestFactory.create(AppModule);
       app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
       app.connectMicroservice(createNestjsKafkaConfig());
       await app.startAllMicroservices();
       await app.listen(3000);
     }`,
  'no-missing-validation-pipe': `@Controller('users')
     class UsersController {
       @Post()
       create(@Body() dto: CreateUserDto) {}
     }`,
  'no-permissive-cors': `app.enableCors({ origin: '*' });`,
  'no-res-bypass-serialization': `@Controller('users')
     @UseInterceptors(ClassSerializerInterceptor)
     export class UsersController {
       @Get(':id')
       async findOne(@Param('id') id: string, @Res() res: Response) {
         res.json(await this.usersService.findOne(id));
       }
     }`,
  'no-unguarded-swagger': `async function bootstrap() {
       const app = await NestFactory.create(ApplicationModule);
       const document = SwaggerModule.createDocument(app, options);
       SwaggerModule.setup('/docs', app, document);
       await app.listen(3000);
     }`,
  'no-unsafe-multer-filename': `diskStorage({
       destination: './uploads',
       filename(req, file, cb) { cb(null, file.originalname); },
     });`,
  'require-guards': `@Controller('users')
     class UsersController {
       @Get()
       findAll() {}
     }`,
  'require-throttler': `@Controller('auth')
     class AuthController {
       @Post('login')
       login() {}
     }`,
  'require-validation-pipe-whitelist': `app.useGlobalPipes(new ValidationPipe());`,
};

/** Files that use no NestJS at all. */
const NON_SDK_SOURCES: ReadonlyArray<readonly [string, string]> = [
  ['the violation itself, minus the import', VIOLATION],
  [
    'a plain helper',
    `export function parse(s: string) {
       try { return JSON.parse(s); } catch { return null; }
     }`,
  ],
  [
    'a React component',
    `export default function Panel({ items }) {
       return items.map((i) => i.name).join(', ');
     }`,
  ],
  [
    'a config module',
    `export const config = { token: process.env.API_TOKEN, retries: 3 };`,
  ],
];

const lint = (code: string, rule: string): Linter.LintMessage[] => {
  // `configType: 'flat'` because a bare `new Linter()` still defaults to
  // eslintrc on the declared ESLint floor, which would ignore the config below
  // and skip every rule — a suite that passes having run nothing.
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: parser as unknown as Linter.Parser,
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      },
      plugins: { n: plugin as unknown as Linter.Plugin },
      rules: { [`n/${rule}`]: 'error' },
    },
    // Without a filename the Linter lints `<input>`, which matches no `files`
    // entry — every rule skipped, every negative below vacuously true.
    'sample.ts',
  );
};

describe('NestJS module gate', () => {
  it('the registry is non-empty, so the sweep below is not vacuous', () => {
    expect(RULES.length).toBeGreaterThan(0);
  });

  describe.each(NON_SDK_SOURCES)('%s', (_name, code) => {
    it.each(RULES)('%s reports nothing', (rule) => {
      const messages = lint(code, rule);
      // A parse or config error also yields zero *rule* findings, so it is
      // asserted away rather than counted as a pass.
      expect(messages.filter((m) => !m.ruleId)).toHaveLength(0);
      expect(messages.map((m) => m.ruleId)).toEqual([]);
    });
  });

  // One real violation per rule, from that rule's own doc. The sweep above
  // only proves silence; a rule whose shapes none of those sources contains
  // would pass it with its gate deleted. Each fixture here must report with the
  // SDK imported and stay silent without it, so reverting the gate in any one
  // rule turns exactly that rule's row red.
  describe.each(RULES)('%s — its own violation', (rule) => {
    const code = RULE_VIOLATIONS[rule];

    it('has a fixture, so a rule added later cannot skip this lock', () => {
      expect(code).toBeTypeOf('string');
    });

    it('reports once the file imports the SDK', () => {
      expect(lint(`${SDK}\n${code}`, rule).length).toBeGreaterThan(0);
    });

    it('is silent with the import removed', () => {
      expect(lint(code, rule)).toHaveLength(0);
    });
  });

  describe('positive control — the gate must open for real NestJS code', () => {
    it('the same violation reports once the file imports the SDK', () => {
      expect(
        lint(`${SDK}\n${VIOLATION}`, 'no-exposed-private-fields').length,
      ).toBeGreaterThan(0);
    });

    it('and is silent with the import removed', () => {
      expect(lint(VIOLATION, 'no-exposed-private-fields')).toHaveLength(0);
    });
  });
});
