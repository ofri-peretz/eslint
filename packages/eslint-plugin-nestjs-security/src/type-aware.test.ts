/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The type-aware half of `no-missing-validation-pipe`.
 *
 * "Does this DTO actually declare any validation?" is the question that killed
 * `require-class-validator`: the answer lives in whichever file declares the
 * DTO, so a syntax-only rule had to guess from the class name and got it wrong
 * often enough to be deleted. With `parserOptions.project` the declaration is
 * reachable, and so is each decorator's *origin* — which is what separates
 * `@IsString()` from `@ApiProperty()` without a list of names.
 *
 * Type information stays optional. The rest of the suite runs without it and
 * asserts the syntax-only behaviour is unchanged; this file is the only place
 * that turns it on.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as path from 'node:path';
import { noMissingValidationPipe } from './rules/no-missing-validation-pipe';

/**
 * Every fixture imports from NestJS, because the rules now abstain in files
 * that use no NestJS at all. Wrapping the arrays rather than editing each
 * fixture means one cannot be left behind — a fixture missing the import would
 * pass vacuously on the gate instead of exercising the detection it was written
 * for. A SIDE-EFFECT import, so it reserves no binding a fixture might declare.
 * `output` and errors[].suggestions[].output are prefixed too, because autofix
 * fixtures assert the whole file back.
 */
const asNest = (code: string): string => `import '@nestjs/common';\n${code}`;
type Suggestion = { output?: string | null };
type Case = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly Suggestion[] } | string>;
};
const nest = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asNest(c) as T;
    const t = c as Case;
    return {
      ...c,
      code: asNest(t.code),
      ...(typeof t.output === 'string' ? { output: asNest(t.output) } : {}),
      ...(t.errors
        ? {
            errors: t.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asNest(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


/**
 * Every case here builds a real TypeScript program through `projectService`,
 * and the first one pays for the whole program. Under the scheduled coverage
 * run — a turbo fan-out of every package's `test:coverage` with v8
 * instrumentation on — that first case took longer than the package's 30s
 * `testTimeout` (codecov.yml run 33717568270, "Test timed out in 30000ms"),
 * which made the coverage upload fail and filed #817. The syntax-only suites
 * keep the 30s default; only type-aware cases get this budget.
 * Locked by ./type-aware-timeout.lock.test.ts.
 */
const TYPE_AWARE_CASE_TIMEOUT_MS = 120_000;

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = (text, callback) => it(text, callback, TYPE_AWARE_CASE_TIMEOUT_MS);

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      tsconfigRootDir: path.resolve(__dirname, '..'),
      // Every case shares one filename on purpose: allowDefaultProject caps
      // at 8 distinct files, and the fixtures already account for several.
      projectService: {
        allowDefaultProject: ['src/*.ts', 'src/type-aware-fixtures/*.ts'],
        defaultProject: 'tsconfig.json',
      },
    },
  },
});

ruleTester.run(
  'no-missing-validation-pipe (type-aware)',
  noMissingValidationPipe,
  {
    valid: nest([
      // The DTO declares a real class-validator rule, so a pipe has something to
      // enforce. This is the case the name-based predecessor could not tell apart
      // from the one below.
      {
        name: 'a DTO that declares a class-validator rule',
        filename: 'src/case.controller.ts',
        code: `
        import { ValidatedDto } from './type-aware-fixtures/dtos';

        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: ValidatedDto) {}
        }
      `,
      },
      // A DTO that extends something may inherit its rules from the base class,
      // and this reads one level only — so abstain rather than guess.
      {
        name: 'a DTO with a base class',
        filename: 'src/case.controller.ts',
        code: `
        import { DerivedDto } from './type-aware-fixtures/dtos';

        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: DerivedDto) {}
        }
      `,
      },
      // An interface has no runtime class for a pipe to attach rules to, and no
      // class declaration for this to read. Out of scope either way.
      {
        name: 'a parameter typed as an interface',
        filename: 'src/case.controller.ts',
        code: `
        import { PlainShape } from './type-aware-fixtures/dtos';

        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: PlainShape) {}
        }
      `,
      },
      // A DTO declared by a dependency is not ours to judge.
      {
        name: 'a DTO declared in node_modules',
        filename: 'src/case.controller.ts',
        code: `
        import { ValidationError } from 'class-validator';

        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: ValidationError) {}
        }
      `,
      },
      // An enum does have a runtime declaration, so it gets past the
      // `valueDeclaration` guard — but it is not a class, so there are no
      // members to inspect for rules.
      {
        name: 'a parameter typed as an enum',
        filename: 'src/case.controller.ts',
        code: `
        import { Channel } from './type-aware-fixtures/dtos';

        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: Channel) {}
        }
      `,
      },
      // A union has no single class to resolve — neither `getSymbol` nor
      // `aliasSymbol` yields one, so there is nothing to inspect.
      {
        name: 'a parameter typed as a union of DTOs',
        filename: 'src/case.controller.ts',
        code: `
        import { EitherDto } from './type-aware-fixtures/dtos';

        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: EitherDto) {}
        }
      `,
      },
      // A type alias resolves through `aliasSymbol`, not to a class declaration,
      // so there is no member list to inspect.
      {
        name: 'a parameter typed as an alias',
        filename: 'src/case.controller.ts',
        code: `
        import { AliasedShape } from './type-aware-fixtures/dtos';

        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: AliasedShape) {}
        }
      `,
      },
      // A type the checker cannot resolve to a class declaration in this project
      // is not ours to judge — abstain rather than accuse.
      {
        name: 'an unresolvable DTO type',
        filename: 'src/case.controller.ts',
        code: `
        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: SomeTypeThatDoesNotExist) {}
        }
      `,
      },
    ]),
    invalid: nest([
      // No annotation at all: nothing for this half to resolve, so it falls
      // through to the syntax-only finding rather than double-reporting.
      {
        name: 'an unannotated body falls through to the syntax-only finding',
        filename: 'src/case.controller.ts',
        code: `
        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto) {}
        }
      `,
        errors: [{ messageId: 'missingValidation' }],
      },
      // A bare decorator reference (`@bareRule`, no parentheses) exercises the
      // non-call branch of the origin lookup. It resolves to a local module
      // rather than class-validator, so it is not a rule and the DTO is
      // unvalidated — reported, which is the point: the decorator's origin
      // decides, not the fact that a decorator is present.
      {
        name: 'a DTO whose only decorator is not a validator',
        filename: 'src/case.controller.ts',
        code: `
        import { BareDecoratorDto } from './type-aware-fixtures/dtos';

        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: BareDecoratorDto) {}
        }
      `,
        errors: [{ messageId: 'undecoratedDto' }],
      },
      // The exposure `require-class-validator` existed for, now decidable: the
      // pipe runs and enforces nothing, so every property passes through.
      {
        name: 'a DTO that declares no rules at all',
        filename: 'src/case.controller.ts',
        code: `
        import { BareDto } from './type-aware-fixtures/dtos';

        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: BareDto) {}
        }
      `,
        errors: [{ messageId: 'undecoratedDto' }],
      },
      // Documented is not validated. `@ApiProperty()` describes the shape for
      // Swagger and enforces nothing — the distinction a decorator-name list
      // cannot make, and the origin lookup can.
      {
        name: 'a DTO decorated only for documentation',
        filename: 'src/case.controller.ts',
        code: `
        import { DocumentedOnlyDto } from './type-aware-fixtures/dtos';

        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: DocumentedOnlyDto) {}
        }
      `,
        errors: [{ messageId: 'undecoratedDto' }],
      },
      // `implements` is not `extends`: an interface has no decorators to
      // inherit, so a DTO that only implements one is still unvalidated. The
      // heritage guard used to abstain on both and swallow this.
      {
        name: 'a DTO that implements an interface and declares no rules',
        filename: 'src/case.controller.ts',
        code: `
        import { BareImplementsDto } from './type-aware-fixtures/dtos';

        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: BareImplementsDto) {}
        }
      `,
        errors: [{ messageId: 'undecoratedDto' }],
      },
      // A class whose only member is an index signature, which cannot carry a
      // decorator — so there are no rules and the pipe enforces nothing.
      {
        name: 'a DTO whose only member cannot hold a decorator',
        filename: 'src/case.controller.ts',
        code: `
        import { IndexSignatureDto } from './type-aware-fixtures/dtos';

        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: IndexSignatureDto) {}
        }
      `,
        errors: [{ messageId: 'undecoratedDto' }],
      },
    ]),
  },
);
