import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHybridAppConfigLoss } from './index';

const ruleTester = new RuleTester();

ruleTester.run('no-hybrid-app-config-loss', noHybridAppConfigLoss, {
  valid: [
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
  ],
  invalid: [
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
  ],
});
