// Model of eslint-plugin-mysql-security/no-unsafe-query (CWE-89).
// A value spliced into the SQL text of a mysql2 / mysql query() or
// execute() (template interpolation, `+` concatenation, `+=` onto a
// statement, a `{ sql }` options object, a local const) is SQL injection
// when this file cannot prove it fixed. In a value position (after `=`,
// inside quotes, double quotes included, which MySQL reads as a string) any
// unproven value is a finding, a request value or a plain parameter alike;
// `String(...)` proves nothing. An escaper's output carries its own quotes,
// so `'${conn.escape(x)}'` closes the author's quote and is a finding too. In
// a fragment position (ORDER BY target, identifier) only request data is a
// finding. Request data as the whole SQL text is a finding. Safe: `?`
// placeholders with values (positional or `{ sql, values }`), escape() in a
// value position, escapeId() in an identifier position, a whole statement
// built by mysql.format(), a constant, a number (`Number(...)`), a `?` list
// built from an array, an allowlist map lookup, a value checked against an
// anchored regex first, a plain parameter as a fragment, a literal. Every
// import / require spelling of `mysql2` and `mysql`, a handle declared with a
// type annotation (`: Pool`, or `: any`, which says nothing about where it
// came from), the bracket spelling of the sink, and execute() are judged; a
// file with no driver import and a test file are not.
module no_unsafe_query {
  type Part = Shapes | Drivers
  type Driver =
    | Default | Promise | Named | Namespace | RequireMysql | RequireDestructured
    | RequireMember | AnyTyped | PoolTyped | Execute | Bracket | NoImport
    | TestFile
  type Shape =
    | TemplateReq | TemplateParam | ConcatReq | IndirectConcat | PlusAssign
    | OptionsSqlTemplate | DoubleQuoted | EscapeInQuotes | StringCast
    | FragmentReq | WholeReq
    | Placeholder | OptionsValues | EscapeValue | EscapeIdFragment
    | FormatWhole | ConstTemplate | NumberTemplate | PlaceholderList
    | AllowlistMap | RegexChecked | FragmentParam | Literal

  pure def unsafe(s: Shape): bool = match s {
    | TemplateReq => true
    | TemplateParam => true
    | ConcatReq => true
    | IndirectConcat => true
    | PlusAssign => true
    | OptionsSqlTemplate => true
    | DoubleQuoted => true
    | EscapeInQuotes => true
    | StringCast => true
    | FragmentReq => true
    | WholeReq => true
    | _ => false
  }
  pure def judged(d: Driver): bool = d != NoImport and d != TestFile

  pure def reports(d: Driver, s: Shape): bool = judged(d) and unsafe(s)

  var part: Part
  var driver: Driver
  var shape: Shape
  var verdict: bool

  action step = {
    nondet pt = Set(Shapes, Drivers).oneOf()
    nondet d = (if (pt == Drivers) Set(
      Default, Promise, Named, Namespace, RequireMysql, RequireDestructured,
      RequireMember, AnyTyped, PoolTyped, Execute, Bracket, NoImport, TestFile,
    ) else Set(Promise)).oneOf()
    nondet s = (if (pt == Shapes) Set(
      TemplateReq, TemplateParam, ConcatReq, IndirectConcat, PlusAssign,
      OptionsSqlTemplate, DoubleQuoted, EscapeInQuotes, StringCast,
      FragmentReq, WholeReq, Placeholder, OptionsValues, EscapeValue,
      EscapeIdFragment, FormatWhole, ConstTemplate, NumberTemplate,
      PlaceholderList, AllowlistMap, RegexChecked, FragmentParam, Literal,
    ) else Set(TemplateReq, ConcatReq, Placeholder, Literal)).oneOf()
    all { part' = pt, driver' = d, shape' = s, verdict' = reports(d, s) }
  }

  action init = step
}
