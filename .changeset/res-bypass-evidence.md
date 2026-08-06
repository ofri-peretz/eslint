---
'eslint-plugin-nestjs-security': minor
---

`no-res-bypass-serialization` no longer reports without evidence of a serializer

The rule's message — "@Exclude() does not apply" — asserted a consequence it
never checked for. Run at `error` over four production NestJS codebases, 23 of
its 27 findings were in repos containing no `ClassSerializerInterceptor` and no
`@Exclude()` anywhere: a real pattern with no disclosure behind it.

It now reports only when a serializer is visible on the controller or the
handler. Set `assumeGlobalSerializer: true` if you register
`ClassSerializerInterceptor` globally in `main.ts` or via `APP_INTERCEPTOR`,
which a controller file cannot see.

Two body shapes are also no longer reported, because neither is an object:
`res.send(JSON.stringify(x))`, and `res.type('html')` and the other bare
extensions Express resolves through `mime.lookup`.
