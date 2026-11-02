// Model of eslint-plugin-secure-coding/no-template-injection (CWE-94).
// Contract: the TEMPLATE argument of a recognised, imported server-side engine
// (Handlebars, EJS, Pug, Lodash template, ...) reached from a request or from a
// value the author named untrusted (`user...`) is reported, directly or via
// concatenation/interpolation. A static template, and a lookup into a constant
// table of templates, are not. A local function that happens to be called
// `compile` is not an engine.
module no_template_injection {
  type Engine = HbsCompile | HbsDestr | EjsRender | PugCompile | LodashTemplate | LocalCompile
  type Tpl = ReqQuery | ConcatReq | UserNamedTpl | Static | ConstLookup

  pure def reports(e: Engine, t: Tpl): bool =
    e != LocalCompile and Set(ReqQuery, ConcatReq, UserNamedTpl).contains(t)

  var engine: Engine
  var tpl: Tpl
  var verdict: bool

  action step = {
    nondet e = Set(HbsCompile, HbsDestr, EjsRender, PugCompile, LodashTemplate, LocalCompile).oneOf()
    nondet t = Set(ReqQuery, ConcatReq, UserNamedTpl, Static, ConstLookup).oneOf()
    all { engine' = e, tpl' = t, verdict' = reports(e, t) }
  }

  action init = step
}
