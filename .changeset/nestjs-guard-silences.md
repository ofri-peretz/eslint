---
'eslint-plugin-nestjs-security': patch
---

`require-guards` reported nothing on an unguarded `@Controller('admin')` in a project that declares no auth library, because the no-authentication-system abstention covered the whole project. A controller or route mounted at `admin`, `superadmin`, `backoffice` and similar paths is now reported there too. Also fixed: an admin controller whose only guard is `ThrottlerGuard` (or a subclass) was counted as guarded, and `app.useGlobalGuards(new ThrottlerGuard())` was counted as a global authentication guard (it now counts as a global throttler, which also quiets `require-throttler`); `@Sse()` routes are now checked; and array paths such as `@Controller(['auth', 'sso'])` and `{ path: [...] }` are read by the public-route exemption. The rule pages now document why `login` is not reported by `require-guards` and why a guarded `verifyEmail` is not reported by `require-throttler`.
