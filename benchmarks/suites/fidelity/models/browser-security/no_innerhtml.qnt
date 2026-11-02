// Model of eslint-plugin-browser-security/no-innerhtml (CWE-79).
// Contract (docs/rules/no-innerhtml.md): an innerHTML/outerHTML write of a
// value that is not a literal string (when allowLiteralStrings) and not the
// result of a trusted sanitizer is reported. textContent is the safe twin.
module no_innerhtml {
  type Sink = InnerHTML | OuterHTML | ComputedInner | InnerPlusEq | TextContent
  type Value =
    | Lit            // '<p>Static</p>'
    | TplStatic      // `<p>Static</p>`
    | TplExpr        // `<div>${userInput}</div>`
    | Concat         // '<p>' + userInput + '</p>'
    | Ident          // userInput (a parameter)
    | UnknownCall    // getUserContent()
    | DomPurify      // DOMPurify.sanitize(userInput)
    | SanitizeFn     // sanitize(userInput)
    | AwaitSanitize  // await sanitize(userInput)
    | CustomSan      // myClean(userInput)
    | ConstLitVar    // const html = '<p>..</p>'; ... = html
  type Trusted = DefaultList | WithCustom
  type Ctx = Prod | TestDefault | TestFlipped

  pure def isHtmlSink(s: Sink): bool = match s {
    | TextContent => false
    | _ => true
  }

  pure def isLiteral(v: Value): bool = match v {
    | Lit => true
    | TplStatic => true
    | ConstLitVar => true
    | _ => false
  }

  pure def isSanitized(v: Value, t: Trusted): bool = match v {
    | DomPurify => true
    | SanitizeFn => true
    | AwaitSanitize => true
    | CustomSan => t == WithCustom
    | _ => false
  }

  // allowInTests defaults to false for this rule.
  pure def skipped(c: Ctx): bool = match c {
    | Prod => false
    | TestDefault => false
    | TestFlipped => true
  }

  pure def reports(s: Sink, v: Value, allowLit: bool, t: Trusted, c: Ctx): bool =
    if (skipped(c) or not(isHtmlSink(s))) false
    else if (isSanitized(v, t)) false
    else if (isLiteral(v)) not(allowLit)
    else true

  var sink: Sink
  var value: Value
  var allowLit: bool
  var trusted: Trusted
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet s = Set(InnerHTML, OuterHTML, ComputedInner, InnerPlusEq, TextContent).oneOf()
    nondet v = Set(Lit, TplStatic, TplExpr, Concat, Ident, UnknownCall, DomPurify, SanitizeFn, AwaitSanitize, CustomSan, ConstLitVar).oneOf()
    nondet a = Set(true, false).oneOf()
    nondet t = Set(DefaultList, WithCustom).oneOf()
    nondet c = Set(Prod, TestDefault, TestFlipped).oneOf()
    all {
      sink' = s,
      value' = v,
      allowLit' = a,
      trusted' = t,
      ctx' = c,
      verdict' = reports(s, v, a, t, c),
    }
  }

  action init = step
}
