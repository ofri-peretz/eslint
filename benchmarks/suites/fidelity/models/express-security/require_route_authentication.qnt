// Model of eslint-plugin-express-security/require-route-authentication (CWE-306).
// A route on an Express app/router with a literal path is reported when the
// path names a critical function (user, account, password, payment, billing,
// config, role, order, … on word boundaries, optional plural) and no
// public-by-design word (login, signup, reset, webhook, health, recover,
// unlock, …), no argument before the final handler reads as authentication
// (requireAuth, authenticate, passport.authenticate('jwt'), verifyToken,
// ensureLoggedIn, a configured `authMiddleware` name; a body parser is not),
// the handler reads no principal (req.user, res.locals.user), the handler
// answers (a next()-only rewriter does not), and the file mounts no
// router-wide guard (before or after the route). The verb does not matter.
// `criticalPaths` / `publicPaths` add fragments; only inputs whose verdict is
// the same whether they extend or replace the default are modelled.
// Receivers are recognised by name: `appReceiverNames` REPLACES the default.
module require_route_authentication {
  type Path =
    | Users | AccountPassword | PaymentsTransfer | InternalConfig | Roles | OrdersId | BillingCard
    | Reorder | BorderCrossing | Articles
    | Login | Signup | PasswordReset | Webhook | Health | RecoverPassword | UnlockAccount
    | Tenants            // critical only with criticalPaths: ['tenant']
    | UsersKiosk         // public only with publicPaths: ['kiosk']
  type PathOpt = NoOpt | CriticalTenant | PublicKiosk
  type Verb = Post | Get | Put | Delete | All
  type Guard =
    | NoGuard
    | RequireAuth | Authenticate | PassportJwt | VerifyToken | EnsureLoggedIn
    | AuthInArray        // app.post('/users', [requireAuth], h)
    | BodyParserOnly     // app.post('/users', jsonParser, h)
    | UseBefore          // app.use(requireAuth) before the route
    | UseAfter           // app.use(requireAuth) after the route
    | ReadsUser          // handler reads req.user
    | ReadsLocalsUser    // handler reads res.locals.user
    | NextOnly           // handler rewrites req.url and calls next()
    | CustomNamed        // withTenantContext, authMiddleware: ['withTenantContext']
    | CustomUnnamed      // withTenantContext, option not set
  type Recv =
    | App | Router
    | RouteChain         // app.route('/users').post(h)
    | Gateway            // const gateway = express(): not a default name
    | GatewayNamed       // appReceiverNames: ['gateway']
    | AppNotNamed        // appReceiverNames: ['gateway'], receiver app
  type Slice = Surface | Guards | Receivers

  pure def critical(p: Path, o: PathOpt): bool = match p {
    | Users => true | AccountPassword => true | PaymentsTransfer => true | InternalConfig => true
    | Roles => true | OrdersId => true | BillingCard => true
    | Tenants => o == CriticalTenant
    | UsersKiosk => o != PublicKiosk
    | _ => false
  }
  pure def guarded(g: Guard): bool =
    not(g == NoGuard or g == BodyParserOnly or g == CustomUnnamed)
  pure def receiverSeen(r: Recv): bool = not(r == Gateway or r == AppNotNamed)

  var path: Path
  var pathOpt: PathOpt
  var verb: Verb
  var guard: Guard
  var recv: Recv
  var verdict: bool

  action step = {
    nondet sl = Set(Surface, Guards, Receivers).oneOf()
    nondet p = (if (sl == Surface)
                  Set(Users, AccountPassword, PaymentsTransfer, InternalConfig, Roles, OrdersId, BillingCard,
                      Reorder, BorderCrossing, Articles, Login, Signup, PasswordReset, Webhook, Health,
                      RecoverPassword, UnlockAccount, Tenants, UsersKiosk)
                else Set(Users)).oneOf()
    nondet o = (if (p == Tenants) Set(NoOpt, CriticalTenant)
                else if (p == UsersKiosk) Set(NoOpt, PublicKiosk) else Set(NoOpt)).oneOf()
    nondet v = (if (sl == Surface and p == Users) Set(Post, Get, Put, Delete, All) else Set(Post)).oneOf()
    nondet g = (if (sl == Guards)
                  Set(NoGuard, RequireAuth, Authenticate, PassportJwt, VerifyToken, EnsureLoggedIn,
                      AuthInArray, BodyParserOnly, UseBefore, UseAfter, ReadsUser, ReadsLocalsUser,
                      NextOnly, CustomNamed, CustomUnnamed)
                else if (sl == Receivers) Set(NoGuard, RequireAuth, UseAfter)
                else Set(NoGuard)).oneOf()
    nondet r = (if (sl == Receivers) Set(App, Router, RouteChain, Gateway, GatewayNamed, AppNotNamed)
                else Set(App)).oneOf()
    all {
      path' = p, pathOpt' = o, verb' = v, guard' = g, recv' = r,
      verdict' = (critical(p, o) and not(guarded(g)) and receiverSeen(r)),
    }
  }

  action init = step
}
