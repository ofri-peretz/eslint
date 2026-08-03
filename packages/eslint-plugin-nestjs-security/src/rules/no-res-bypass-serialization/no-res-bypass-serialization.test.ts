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
