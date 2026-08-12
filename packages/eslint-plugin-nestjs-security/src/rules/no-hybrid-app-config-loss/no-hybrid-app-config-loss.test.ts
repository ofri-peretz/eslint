import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHybridAppConfigLoss } from './index';

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


const ruleTester = new RuleTester();

ruleTester.run('no-hybrid-app-config-loss', noHybridAppConfigLoss, {
  valid: nest([
    // The fix, in the shape the NestJS docs publish.
    {
      code: `
        const app = await NestFactory.create(AppModule);
        app.connectMicroservice(kafkaOptions, { inheritAppConfig: true });
      `,
    },
    // Generic form — amplication spells every one of its call sites this way.
    {
      code: `
        app.connectMicroservice<MicroserviceOptions>(createNestjsKafkaConfig(), {
          inheritAppConfig: true,
        });
      `,
    },
    // A spread could carry the flag; absence is not provable, so abstain.
    {
      code: `app.connectMicroservice(options, { ...hybridOptions });`,
    },
    // Hybrid options built elsewhere are not knowable from this file.
    {
      code: `app.connectMicroservice(options, hybridOptions);`,
    },
    // A truthy non-boolean literal still inherits.
    {
      code: `app.connectMicroservice(options, { inheritAppConfig: 1 });`,
    },
    // A non-literal value could be true at runtime.
    {
      code: `app.connectMicroservice(options, { inheritAppConfig: config.inherit });`,
    },
    // NestJS's own implementation of the API, not an application using it.
    {
      code: `
        class NestApplication {
          connect(options) {
            return this.connectMicroservice(options);
          }
        }
      `,
    },
    // A different method that happens to be called on the app.
    {
      code: `app.connectSomethingElse(options);`,
    },
    // No transport argument at all — not a real hybrid registration.
    {
      code: `app.connectMicroservice();`,
    },
    // Test files are exempt by default.
    {
      code: `app.connectMicroservice(options);`,
      filename: 'app.e2e-spec.ts',
    },
  ]),
  invalid: nest([
    // amplication/packages/amplication-server/src/main.ts:41 and four siblings.
    {
      code: `app.connectMicroservice<MicroserviceOptions>(createNestjsKafkaConfig());`,
      errors: [{ messageId: 'configNotInherited' }],
    },
    // awesome-nest-bp/src/main.ts:79.
    {
      code: `
        app.connectMicroservice({
          transport: Transport.TCP,
          options: { port: 3001 },
        });
      `,
      errors: [{ messageId: 'configNotInherited' }],
    },
    // The flag is present but explicitly off — the one case where absence of
    // inheritance is stated outright.
    {
      code: `app.connectMicroservice(options, { inheritAppConfig: false });`,
      errors: [{ messageId: 'configNotInherited' }],
    },
    // Every statically falsy literal leaves the config behind, not just
    // `false` — NestJS inherits on a truthy value.
    {
      code: `app.connectMicroservice(options, { inheritAppConfig: 0 });`,
      errors: [{ messageId: 'configNotInherited' }],
    },
    {
      code: `app.connectMicroservice(options, { inheritAppConfig: '' });`,
      errors: [{ messageId: 'configNotInherited' }],
    },
    {
      code: `app.connectMicroservice(options, { inheritAppConfig: null });`,
      errors: [{ messageId: 'configNotInherited' }],
    },
    // Hybrid options that say something else entirely.
    {
      code: `app.connectMicroservice(options, { someOtherFlag: true });`,
      errors: [{ messageId: 'configNotInherited' }],
    },
    // allowInTests: false brings test files back into scope.
    {
      code: `app.connectMicroservice(options);`,
      filename: 'app.e2e-spec.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'configNotInherited' }],
    },
  ]),
});

/**
 * The change these accompany was the labels themselves. Every RuleTester case
 * asserts `{ messageId: 'configNotInherited' }`, which is a key lookup — it
 * passes whether the message says CWE-20 or the CWE-284 pillar it replaced.
 * Revert the metadata and the suite above stays green. These fail.
 */
describe('reported severity metadata', () => {
  it('maps to CWE-20, not the discouraged CWE-284 pillar', () => {
    const message = noHybridAppConfigLoss.meta.messages.configNotInherited;
    expect(message).toContain('CWE-20');
    expect(message).toContain('5.3');
    expect(message).not.toContain('CWE-284');
    expect(message).not.toContain('7.5');
  });

  it('agrees with the rule-level docs metadata', () => {
    expect(noHybridAppConfigLoss.meta.docs.cwe).toBe('CWE-20');
    expect(noHybridAppConfigLoss.meta.docs.cvss).toBe(5.3);
  });
});
