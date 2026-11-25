---
'eslint-plugin-nestjs-security': patch
---

`require-throttler` reports at the route decorator (`@Post`, `@Get`, ...) instead of at the handler's first decorator, so the line points at the route and not at `@ApiOkResponse`, `@SerializeOptions` or `@Public`. Found linting popular NestJS starters.
