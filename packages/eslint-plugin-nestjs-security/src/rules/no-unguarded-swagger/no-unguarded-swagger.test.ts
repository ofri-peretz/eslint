import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnguardedSwagger } from './index';

const ruleTester = new RuleTester();

ruleTester.run('no-unguarded-swagger', noUnguardedSwagger, {
  valid: [
    // prisma-starter: the minimally-different correct version, from the corpus.
    `
      async function bootstrap() {
        const app = await NestFactory.create(AppModule);
        if (swaggerConfig.enabled) {
          const document = SwaggerModule.createDocument(app, options);
          SwaggerModule.setup(swaggerConfig.path || 'api', app, document);
        }
        await app.listen(3000);
      }
    `,
    // Any condition counts. The rule has no business arguing about which one —
    // gating on a config flag is as correct as gating on NODE_ENV.
    `
      async function bootstrap() {
        const app = await NestFactory.create(AppModule);
        if (process.env.NODE_ENV !== 'production') {
          SwaggerModule.setup('docs', app, document);
        }
      }
    `,
    `
      async function bootstrap() {
        const app = await NestFactory.create(AppModule);
        isDev && SwaggerModule.setup('docs', app, document);
      }
    `,
    `
      async function bootstrap() {
        const app = await NestFactory.create(AppModule);
        isDev ? SwaggerModule.setup('docs', app, document) : undefined;
      }
    `,
    // immich / awesome-nest-bp / novu: a helper taking `app`. The guard is at
    // the call site, in another file — accusing this accuses correct code.
    `
      export function setupSwagger(app: INestApplication) {
        const document = SwaggerModule.createDocument(app, options);
        SwaggerModule.setup('docs', app, document);
      }
    `,
    // createDocument alone publishes nothing.
    `
      async function bootstrap() {
        const app = await NestFactory.create(AppModule);
        const document = SwaggerModule.createDocument(app, options);
      }
    `,
    // A different module that happens to have a setup().
    `
      async function bootstrap() {
        const app = await NestFactory.create(AppModule);
        OtherModule.setup('docs', app, document);
      }
    `,
    // Top-level, outside any function — nothing to anchor on.
    `SwaggerModule.setup('docs', app, document);`,
    {
      code: `
        async function bootstrap() {
          const app = await NestFactory.create(AppModule);
          SwaggerModule.setup('docs', app, document);
        }
      `,
      filename: 'main.e2e-spec.ts',
    },
  ],
  invalid: [
    // realworld/src/main.ts — straight-line in bootstrap, no check anywhere.
    {
      code: `
        async function bootstrap() {
          const app = await NestFactory.create(ApplicationModule);
          const document = SwaggerModule.createDocument(app, options);
          SwaggerModule.setup('/docs', app, document);
          await app.listen(3000);
        }
      `,
      errors: [{ messageId: 'unguardedSwagger' }],
    },
    // The generic form — a regex census misses this, an AST pass does not.
    {
      code: `
        async function bootstrap() {
          const app = await NestFactory.create<NestExpressApplication>(AppModule);
          SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, cfg));
        }
      `,
      errors: [{ messageId: 'unguardedSwagger' }],
    },
    // An arrow bootstrap is the same shape.
    {
      code: `
        const bootstrap = async () => {
          const app = await NestFactory.create(AppModule);
          SwaggerModule.setup('docs', app, document);
        };
      `,
      errors: [{ messageId: 'unguardedSwagger' }],
    },
    {
      code: `
        async function bootstrap() {
          const app = await NestFactory.create(AppModule);
          SwaggerModule.setup('docs', app, document);
        }
      `,
      filename: 'main.e2e-spec.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'unguardedSwagger' }],
    },
  ],
});
