import { RuleTester } from '@typescript-eslint/rule-tester';
import { noResBypassSerialization } from './index';

const ruleTester = new RuleTester();

ruleTester.run('no-res-bypass-serialization', noResBypassSerialization, {
  valid: [
    // The fix: interceptors still run, so @Exclude() still applies.
    `
      @Controller('users')
      class UsersController {
        @Get()
        findAll(@Res({ passthrough: true }) res: Response) {
          res.status(200);
          return this.users.findAll();
        }
      }
    `,
    // No @Res() at all — the normal Nest handler.
    `
      @Controller('users')
      class UsersController {
        @Get()
        findAll() { return this.users.findAll(); }
      }
    `,
    // immich/brocoders: streams a file. Nothing to serialize.
    `
      @Controller('files')
      class FilesController {
        @Get(':path')
        download(@Res() res: Response) {
          res.sendFile(this.path);
        }
      }
    `,
    // immich: redirects. Nothing to serialize.
    `
      @Controller('assets')
      class AssetController {
        @Get(':id/thumbnail')
        thumbnail(@Res() res: Response) {
          res.redirect(this.url);
        }
      }
    `,
    // truthy: a 204 with an empty body. Nothing to serialise, so nothing the
    // interceptor bypass could have leaked.
    `
      @Controller('auth')
      class AuthController {
        @Post('login')
        async login(@Res() response: Response) {
          response.setHeader('Set-Cookie', cookiePayload);
          return response.status(204).json({});
        }
      }
    `,
    // amplication health checks: sends a string literal.
    `
      @Controller('health')
      class HealthController {
        @Get()
        check(@Res() res: Response) {
          res.status(200).send('ok');
        }
      }
    `,
    `
      @Controller('health')
      class HealthController {
        @Get()
        check(@Res() res: Response) {
          res.send(\`ok\`);
        }
      }
    `,
    // amplication/immich: res handed to a service. This file cannot see what
    // happens to it, so the rule says nothing.
    `
      @Controller('auth')
      class AuthController {
        @Get('callback')
        callback(@Res() res: Response) {
          return this.authService.complete(res);
        }
      }
    `,
    // A spread could set passthrough.
    `
      @Controller('users')
      class UsersController {
        @Get()
        findAll(@Res({ ...opts }) res: Response) { res.json(this.users); }
      }
    `,
    // A field, not the injected parameter — different object entirely.
    `
      @Controller('users')
      class UsersController {
        @Get()
        findAll(@Res() res: Response) { this.res.json(this.users); }
      }
    `,
    // Writing to something that is not the injected response.
    `
      @Controller('users')
      class UsersController {
        @Get()
        findAll(@Res() res: Response) { other.json(this.users); }
      }
    `,
    // A route-shaped method on a class that is not a @Controller.
    `
      class UsersService {
        @Get()
        findAll(@Res() res: Response) { res.json(this.users); }
      }
    `,
    // Not a route handler.
    `
      @Controller('users')
      class UsersController {
        helper(@Res() res: Response) { res.json(this.users); }
      }
    `,
    // Destructured response gives us no binding to follow.
    `
      @Controller('users')
      class UsersController {
        @Get()
        findAll(@Res() { json }: Response) { json(this.users); }
      }
    `,
    // A nested function that rebinds the name is a different `res`. Reported by
    // an earlier version, which walked into every function body regardless of
    // scope.
    `
      @Controller('users')
      class UsersController {
        @Get()
        findAll(@Res() res: Response) {
          const transform = (res: InnerType) => {
            res.json(someData);
          };
          res.status(200).send('ok');
        }
      }
    `,
    // Same for a function expression and a declaration.
    `
      @Controller('users')
      class UsersController {
        @Get()
        findAll(@Res() res: Response) {
          this.stream.on('data', function (res) { res.send(chunk); });
          res.sendFile(this.path);
        }
      }
    `,
    `
      @Controller('users')
      class UsersController {
        @Get()
        findAll(@Res() res: Response) {
          function render(res) { res.json(model); }
          res.redirect(this.url);
        }
      }
    `,
    // Test files are exempt by default.
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll(@Res() res: Response) { res.json(this.users); }
        }
      `,
      filename: 'users.controller.spec.ts',
    },
  ],
  invalid: [
    // novu: res.json() with a domain object.
    {
      code: `
        @Controller('chat')
        class WebChatController {
          @Post()
          send(@Res() res: Response) {
            res.status(200).json(session);
          }
        }
      `,
      errors: [
        { messageId: 'bypassesSerialization', data: { writer: 'res.json()' } },
      ],
    },
    // amplication: res.send() with a value from a service.
    {
      code: `
        @Controller('marketplace')
        class AwsMarketplaceController {
          @Post()
          async register(@Res() res: Response) {
            res.send(await this.service.register());
          }
        }
      `,
      errors: [{ messageId: 'bypassesSerialization' }],
    },
    // Undecorated params sit alongside the response, and a plain function call
    // is not a body write.
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get(':id')
          findOne(id: string, @Res() res: Response) {
            track();
            res.json(this.users.find(id));
            res.json(this.audit);
          }
        }
      `,
      errors: [{ messageId: 'bypassesSerialization' }],
    },
    // The alias is the same decorator.
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll(@Response() res) { res.json(this.users); }
        }
      `,
      errors: [{ messageId: 'bypassesSerialization' }],
    },
    // passthrough explicitly off is the same as absent.
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll(@Res({ passthrough: false }) res: Response) { res.json(user); }
        }
      `,
      errors: [{ messageId: 'bypassesSerialization' }],
    },
    // novu: writes an object on one path and redirects on another — the object
    // path is real, so the finding stands.
    {
      code: `
        @Controller('integrations')
        class IntegrationsController {
          @Get('oauth')
          oauth(@Res() res: Response) {
            if (this.failed) return res.redirect(this.url);
            res.setHeader('Content-Type', 'application/json');
            res.send(credentials);
          }
        }
      `,
      errors: [{ messageId: 'bypassesSerialization' }],
    },
    // A nested function that does NOT rebind the name still writes to the
    // injected response — the closure is the same binding.
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll(@Res() res: Response) {
            this.service.load().then((data) => res.json(data));
          }
        }
      `,
      errors: [{ messageId: 'bypassesSerialization' }],
    },
    // A non-empty object literal still carries fields that @Exclude() governs.
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll(@Res() res: Response) { res.json({ user: this.user }); }
        }
      `,
      errors: [{ messageId: 'bypassesSerialization' }],
    },
    // jsonp writes a body too.
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll(@Res() res: Response) { res.jsonp(this.users); }
        }
      `,
      errors: [{ messageId: 'bypassesSerialization' }],
    },
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll(@Res() res: Response) { res.json(this.users); }
        }
      `,
      filename: 'users.controller.spec.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'bypassesSerialization' }],
    },
  ],
});
