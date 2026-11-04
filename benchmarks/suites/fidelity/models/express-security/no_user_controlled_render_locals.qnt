// Model of eslint-plugin-express-security/no-user-controlled-render-locals (CWE-73).
// res.render() is reported when its view name derives from request input
// (req.query/params/body member, template or concatenation), or when its
// locals are a whole request object: passed directly, spread into the locals,
// aliased through a single const (or `const { body } = req`), copied by
// Object.assign, or handed to an unknown call. Field-picking,
// static locals and a view chosen from a fixed map are safe. allowSanitizers
// (non-default ['pick']) clears pick(req.body, …). No Express: no report.
// Documented false negatives (reassignment, cross-function flow, nested
// req.body.profile, computed req['body']) are not modelled.
module no_user_controlled_render_locals {
  type View = LitView | QueryView | TemplateView | ConcatView | MapView
  type Locals =
    | NoLocals | Static | FieldPick
    | WholeBody | WholeParams | QuerySpread | Alias | Destructured | Assign | Transform | Pick
  type Names = ReqRes | RequestResponse
  type Mount = App | Router | RequireApp | NoExpress
  type Opts = Default | Sanitizers

  pure def viewUnsafe(v: View): bool = v == QueryView or v == TemplateView or v == ConcatView
  pure def localsUnsafe(l: Locals, o: Opts): bool =
    l == WholeBody or l == WholeParams or l == QuerySpread or l == Alias or l == Destructured
      or l == Assign or l == Transform
      or (l == Pick and o == Default)

  var view: View
  var locals: Locals
  var names: Names
  var mount: Mount
  var opts: Opts
  var verdict: bool

  action step = {
    nondet v = Set(LitView, QueryView, TemplateView, ConcatView, MapView).oneOf()
    // Locals are crossed with a literal view; a request-derived view with
    // no or static locals.
    nondet l = (if (v == LitView)
                  Set(NoLocals, Static, FieldPick, WholeBody, WholeParams, QuerySpread, Alias, Destructured,
                      Assign, Transform, Pick)
                else Set(NoLocals, Static)).oneOf()
    nondet n = Set(ReqRes, RequestResponse).oneOf()
    nondet m = Set(App, Router, RequireApp, NoExpress).oneOf()
    nondet o = Set(Default, Sanitizers).oneOf()
    all { view' = v, locals' = l, names' = n, mount' = m, opts' = o,
          verdict' = ((viewUnsafe(v) or localsUnsafe(l, o)) and m != NoExpress) }
  }

  action init = step
}
