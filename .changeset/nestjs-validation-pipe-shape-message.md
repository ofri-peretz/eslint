---
'eslint-plugin-nestjs-security': patch
---

fix: no-missing-validation-pipe names the real problem when a global pipe is registered

With `app.useGlobalPipes(new ValidationPipe())` in place, an input typed as an inline literal, `any`, `unknown` or `object` was reported as "receives user input without ValidationPipe", and the fix told you to register the global pipe the project already had. The pipe passes such a value through because there is no class to validate against. These inputs now get their own message, which asks for a DTO class. Found on Ghostfolio's controllers, where six routes type their body inline beside a global pipe.
