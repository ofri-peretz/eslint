// Model of eslint-plugin-import-next/dynamic-import-chunkname.
// A user-configured webpack convention, taken as given: every dynamic
// import carries a `/* webpackChunkName: "name" */` comment inside the call,
// before the module argument, and the name matches `webpackChunknameFormat`
// (default `([0-9a-zA-Z-_/.]|\[(request|index)\])+`: webpack's `[request]`
// and `[index]` placeholders are valid names). Dynamic imports are `import()`
// and, when listed in `importFunctions`, calls to those functions; other
// calls are not imports. `allowEmpty: true` accepts an import with no chunk
// name comment. `webpackMode: "eager"` puts the module in the parent chunk,
// so there is no chunk to name: silent.
module dynamic_import_chunkname {
  type Callee = ImportExpr | CustomFn | OtherFn
  type Comment = NoComment | ValidName | Placeholder | BadName | Eager
  type Format = DefaultFormat | CustomFormat

  // Does the chunk name in comment c match the format?
  pure def nameOk(c: Comment, f: Format): bool =
    if (f == DefaultFormat) Set(ValidName, Placeholder).contains(c)
    else c == ValidName

  pure def reports(cl: Callee, c: Comment, ae: bool, fns: bool, f: Format): bool =
    val checked = cl == ImportExpr or (cl == CustomFn and fns)
    checked and (
      if (c == NoComment) not(ae)
      else if (c == Eager) false
      else not(nameOk(c, f)))

  var callee: Callee
  var comment: Comment
  var allowEmpty: bool
  var importFunctions: bool
  var format: Format
  var verdict: bool

  action step = {
    nondet cl = Set(ImportExpr, CustomFn, OtherFn).oneOf()
    nondet c = Set(NoComment, ValidName, Placeholder, BadName, Eager).oneOf()
    nondet ae = Set(true, false).oneOf()
    nondet fns = Set(true, false).oneOf()
    nondet f = Set(DefaultFormat, CustomFormat).oneOf()
    all { callee' = cl, comment' = c, allowEmpty' = ae, importFunctions' = fns, format' = f,
          verdict' = reports(cl, c, ae, fns, f) }
  }

  action init = step
}
