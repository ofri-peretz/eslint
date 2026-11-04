// Model of eslint-plugin-mongodb-security/no-unsafe-regex-query (CWE-400).
// A request value used as a regex pattern — a `$regex` operand,
// with or without `$options`, interpolated into a template, inside an `$or`
// branch, or a `RegExp` built from it (with or without `new`) as a filter
// value — lets the client send a catastrophic pattern (ReDoS) or probe data.
// The same value passed through an escaper (`escapeRegex`, `_.escapeRegExp`, or
// the default export of `escape-string-regexp` under any name) is a literal
// pattern; `$text` search, a literal string and a regex literal are fine.
module no_unsafe_regex_query {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx

  type Receiver = Model | RequireModel | NamedModel | Nest | Native | NoImport
  type Pattern =
    | RegexQuery | RegexBodyWithOptions | RegexTemplateReq | NewRegExpReq | RegExpCallReq | RegexInOr
    | EscapedCall | EscapedTemplate | LodashEscaped | DefaultImportEscaper
    | TextSearch | LiteralString | RegexLiteral

  pure def unsafe(p: Pattern): bool = match p {
    | RegexQuery => true
    | RegexBodyWithOptions => true
    | RegexTemplateReq => true
    | NewRegExpReq => true
    | RegExpCallReq => true
    | RegexInOr => true
    | EscapedCall => false
    | EscapedTemplate => false
    | LodashEscaped => false
    | DefaultImportEscaper => false
    | TextSearch => false
    | LiteralString => false
    | RegexLiteral => false
  }

  pure def reports(r: Receiver, p: Pattern): bool = r != NoImport and unsafe(p)

  var receiver: Receiver
  var pattern: Pattern
  var verdict: bool

  action step = {
    nondet r = Set(Model, RequireModel, NamedModel, Nest, Native, NoImport).oneOf()
    nondet p = Set(
      RegexQuery, RegexBodyWithOptions, RegexTemplateReq, NewRegExpReq, RegExpCallReq, RegexInOr,
      EscapedCall, EscapedTemplate, LodashEscaped, DefaultImportEscaper,
      TextSearch, LiteralString, RegexLiteral,
    ).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      receiver' = r,
      pattern' = p,
      testCtx' = tc,
      verdict' = (reports(r, p) and not(exempt(tc))),
    }
  }

  action init = step
}
