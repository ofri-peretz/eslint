---
'eslint-plugin-lambda-security': patch
---

fix(lambda-security): the Lambda gate no longer reads a local `handler` assignment as a handler export

`handler = handler || noop` (reassigning a parameter), `this.handler = h` and
`opts.handler = fn` admitted a file with no AWS import, no handler export and no
`(event, context)` function as Lambda code, switching on all fourteen rules. The
assignment arm now requires the `exports` / `module.exports` receiver its docstring
lists. ES2022 string export names (`export { main as "handler" }`) now count as a
handler export.
