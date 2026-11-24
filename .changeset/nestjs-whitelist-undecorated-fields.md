---
'eslint-plugin-nestjs-security': patch
---

fix: require-validation-pipe-whitelist warns that whitelist strips undecorated DTO fields

`whitelist: true` keeps a property only when it carries a class-validator decorator, so a declared but undecorated field is removed too. The message and docs said only undeclared properties were stripped; following them as written would have broken three of the ten NestJS samples the rule flags. The fix text now says to decorate every accepted field first (`@IsString()`, `@IsOptional()`, `@Allow()`).
