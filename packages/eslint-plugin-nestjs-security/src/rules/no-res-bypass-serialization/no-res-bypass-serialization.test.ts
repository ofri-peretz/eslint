import { RuleTester } from '@typescript-eslint/rule-tester';
import { noResBypassSerialization } from './index';

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

ruleTester.run('no-res-bypass-serialization', noResBypassSerialization, {
  valid: nest([
    // ghostfolio/apps/api/src/app/endpoints/sitemap/sitemap.controller.ts:34 —
    // declares XML and sends an interpolated document. The body is a helper
    // call so it is not provably a string, but the content type settles it:
    // ClassSerializerInterceptor produces JSON, and this is not JSON.
    `
      @Controller('sitemap.xml')
      @UseInterceptors(ClassSerializerInterceptor)
      class SitemapController {
        @Get()
        getSitemapXml(@Res() response: Response) {
          response.setHeader('content-type', 'application/xml');
          response.send(interpolate(this.sitemapXml, { currentDate }));
        }
      }
    `,
    `
      @Controller()
      @UseInterceptors(ClassSerializerInterceptor)
      class PageController {
        @Get()
        page(@Res() res: Response) {
          res.type('text/html');
          res.send(render(this.template, model));
        }
      }
    `,
    // nest-framework/sample/28-sse/src/app.controller.ts:11 — a static HTML
    // page sent as a string. No DTO, so no @Exclude() the missing
    // interceptor could have dropped.
    `
      @Controller()
      @UseInterceptors(ClassSerializerInterceptor)
      class AppController {
        @Get()
        index(@Res() response: Response) {
          response.type('text/html').send(readFileSync(join(__dirname, 'index.html')).toString());
        }
      }
    `,
    `
      @Controller()
      @UseInterceptors(ClassSerializerInterceptor)
      class AppController {
        @Get()
        raw(@Res() res: Response) {
          res.send(String(value));
        }
      }
    `,
    // The fix: interceptors still run, so @Exclude() still applies.
    `
      @Controller('users')
      @UseInterceptors(ClassSerializerInterceptor)
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
      @UseInterceptors(ClassSerializerInterceptor)
      class UsersController {
        @Get()
        findAll() { return this.users.findAll(); }
      }
    `,
    // immich/brocoders: streams a file. Nothing to serialize.
    `
      @Controller('files')
      @UseInterceptors(ClassSerializerInterceptor)
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
      @UseInterceptors(ClassSerializerInterceptor)
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
      @UseInterceptors(ClassSerializerInterceptor)
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
      @UseInterceptors(ClassSerializerInterceptor)
      class HealthController {
        @Get()
        check(@Res() res: Response) {
          res.status(200).send('ok');
        }
      }
    `,
    `
      @Controller('health')
      @UseInterceptors(ClassSerializerInterceptor)
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
      @UseInterceptors(ClassSerializerInterceptor)
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
      @UseInterceptors(ClassSerializerInterceptor)
      class UsersController {
        @Get()
        findAll(@Res({ ...opts }) res: Response) { res.json(this.users); }
      }
    `,
    // A field, not the injected parameter — different object entirely.
    `
      @Controller('users')
      @UseInterceptors(ClassSerializerInterceptor)
      class UsersController {
        @Get()
        findAll(@Res() res: Response) { this.res.json(this.users); }
      }
    `,
    // Writing to something that is not the injected response.
    `
      @Controller('users')
      @UseInterceptors(ClassSerializerInterceptor)
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
      @UseInterceptors(ClassSerializerInterceptor)
      class UsersController {
        helper(@Res() res: Response) { res.json(this.users); }
      }
    `,
    // Destructured response gives us no binding to follow.
    `
      @Controller('users')
      @UseInterceptors(ClassSerializerInterceptor)
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
      @UseInterceptors(ClassSerializerInterceptor)
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
      @UseInterceptors(ClassSerializerInterceptor)
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
      @UseInterceptors(ClassSerializerInterceptor)
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
      name: 'the same controller where the interceptor still runs',
      code: `
        @Controller('users')
        @UseInterceptors(ClassSerializerInterceptor)
        class UsersController {
          @Get()
          findAll(@Res() res: Response) { res.json(this.users); }
        }
      `,
      filename: 'users.controller.spec.ts',
    },

    // ---- No serializer in sight ----------------------------------------
    // The harm this rule names needs a serializer to have been running. Across
    // twenty, ghostfolio and amplication — 23 findings — there was no
    // ClassSerializerInterceptor and no @Exclude() anywhere in the repo, so
    // every one of them described a leak that could not happen.
    `
      @Controller('users')
      class UsersController {
        @Get()
        findAll(@Res() res: Response) { res.json(this.users); }
      }
    `,
    // An interceptor that is not the serializer is not evidence of one.
    // Treating any @UseInterceptors() as proof would put the accusation back.
    `
      @Controller('users')
      @UseInterceptors(LoggingInterceptor)
      class UsersController {
        @Get()
        findAll(@Res() res: Response) { res.json(this.users); }
      }
    `,
    // A bare decorator reference names no interceptor at all.
    `
      @Controller('users')
      @UseInterceptors
      class UsersController {
        @Get()
        findAll(@Res() res: Response) { res.json(this.users); }
      }
    `,

    // ---- A serializer IS mounted, but the body is not an object ----------
    // novu/apps/api/src/app/integrations/integrations.controller.ts:542 —
    // the controller does carry @UseInterceptors(ClassSerializerInterceptor),
    // so the gate above does not clear it. The body settles it: JSON.stringify
    // returns a string, and a string has no @Exclude()d field to lose.
    `
      @Controller('integrations')
      @UseInterceptors(ClassSerializerInterceptor)
      class IntegrationsController {
        @Get(':id/template')
        template(@Res() res: Response) {
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify(template, null, 2));
        }
      }
    `,
    // Same controller, :639 — Express `res.type()` takes a bare extension and
    // runs it through mime.lookup, so 'html' is text/html. Matching only full
    // MIME types read this as a JSON response.
    `
      @Controller('integrations')
      @UseInterceptors(ClassSerializerInterceptor)
      class IntegrationsController {
        @Get('callback')
        callback(@Res() res: Response) {
          res.status(400).type('html').send(buildPopupHtml(model));
        }
      }
    `,
  ]),
  invalid: nest([
    // A non-JSON content type on some *other* object says nothing about what
    // this handler writes. Scanning the whole body let it silence the rule.
    {
      name: 'writing through @Res() skips the ClassSerializerInterceptor above it',
      code: `
        @Controller('users')
        @UseInterceptors(ClassSerializerInterceptor)
        class UsersController {
          @Get()
          find(@Res() res: Response) {
            this.cacheService.setHeader('text/plain', 'x');
            res.json(user);
          }
        }
      `,
      errors: [{ messageId: 'bypassesSerialization' }],
    },
    // A JSON content type is the case the rule exists for — declaring it
    // changes nothing.
    {
      code: `
        @Controller('users')
        @UseInterceptors(ClassSerializerInterceptor)
        class UsersController {
          @Get()
          find(@Res() res: Response) {
            res.setHeader('content-type', 'application/json');
            res.json(user);
          }
        }
      `,
      errors: [{ messageId: 'bypassesSerialization' }],
    },
    // novu: res.json() with a domain object.
    {
      code: `
        @Controller('chat')
        @UseInterceptors(ClassSerializerInterceptor)
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
        @UseInterceptors(ClassSerializerInterceptor)
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
        @UseInterceptors(ClassSerializerInterceptor)
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
        @UseInterceptors(ClassSerializerInterceptor)
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
        @UseInterceptors(ClassSerializerInterceptor)
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
        @UseInterceptors(ClassSerializerInterceptor)
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
        @UseInterceptors(ClassSerializerInterceptor)
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
        @UseInterceptors(ClassSerializerInterceptor)
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
        @UseInterceptors(ClassSerializerInterceptor)
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
        @UseInterceptors(ClassSerializerInterceptor)
        class UsersController {
          @Get()
          findAll(@Res() res: Response) { res.json(this.users); }
        }
      `,
      filename: 'users.controller.spec.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'bypassesSerialization' }],
    },
    // A serializer registered globally in main.ts cannot be seen from a
    // controller file. brocoders/nestjs-boilerplate does exactly this
    // (`app.useGlobalInterceptors(new ClassSerializerInterceptor(...))`), so
    // without this option its @Res() handlers would be a false negative.
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll(@Res() res: Response) { res.json(this.users); }
        }
      `,
      options: [{ assumeGlobalSerializer: true }],
      errors: [{ messageId: 'bypassesSerialization' }],
    },
    // @SerializeOptions() is inert without the interceptor, so its presence
    // means one is mounted above — evidence on its own.
    {
      code: `
        @Controller('users')
        @SerializeOptions({ strategy: 'excludeAll' })
        class UsersController {
          @Get()
          findAll(@Res() res: Response) { res.json(this.users); }
        }
      `,
      errors: [{ messageId: 'bypassesSerialization' }],
    },
    // Mounted on the handler rather than the class.
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          @UseInterceptors(new ClassSerializerInterceptor(reflector))
          findAll(@Res() res: Response) { res.json(this.users); }
        }
      `,
      errors: [{ messageId: 'bypassesSerialization' }],
    },
    // A nested function that rebinds the name declares a content type on a
    // *different* response. The content-type scan has to honour scope the same
    // way the write scan does — otherwise this inner `res.type('html')` clears
    // the outer `res.json(user)` and the finding disappears.
    {
      code: `
        @Controller('users')
        @UseInterceptors(ClassSerializerInterceptor)
        class UsersController {
          @Get()
          findAll(@Res() res: Response) {
            this.pages.render((res) => res.type('html').send(page));
            res.json(this.users);
          }
        }
      `,
      errors: [{ messageId: 'bypassesSerialization' }],
    },
    // Another decorated parameter sits alongside the response — the scan has to
    // walk past @Body() to reach @Res().
    {
      code: `
        @Controller('users')
        @UseInterceptors(ClassSerializerInterceptor)
        class UsersController {
          @Post()
          create(@Body() dto: CreateUserDto, @Res() res: Response) {
            res.json(this.users.create(dto));
          }
        }
      `,
      errors: [{ messageId: 'bypassesSerialization' }],
    },
    // A serializer is mounted and the body is a real object: res.type('json')
    // names exactly the case this rule exists for, so the shorthand list must
    // not include it.
    {
      code: `
        @Controller('users')
        @UseInterceptors(ClassSerializerInterceptor)
        class UsersController {
          @Get()
          findAll(@Res() res: Response) { res.type('json').send(this.users); }
        }
      `,
      errors: [{ messageId: 'bypassesSerialization' }],
    },
  ]),
});
