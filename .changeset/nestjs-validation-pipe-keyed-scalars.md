---
'eslint-plugin-nestjs-security': patch
---

fix: `no-missing-validation-pipe` no longer reports one named scalar

`@Param('id') id` is a URL path segment and always a string, and an unannotated `@Query('page') page = 1` is validated exactly as much as `page: string`, which was already exempt. Both were reported with advice to add a `ValidationPipe`, which does nothing for a primitive. On 79 NestJS repositories those two shapes were 105 of the rule's 489 reports; 20 of them were added by 4.1.0, which started reading default-valued parameters.

Still reported: a whole `@Body()`, `@Query()` or `@Param()` object with nothing validating it, a keyed body field (`@Body('code') code`), and a keyed query value annotated as an object or a DTO.
