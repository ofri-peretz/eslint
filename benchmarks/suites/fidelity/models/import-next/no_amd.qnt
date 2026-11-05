// Model of eslint-plugin-import-next/no-amd.
// An AMD module is a call to the GLOBAL `define` (any form: dependency array
// and factory, a bare factory, a named module, an object) or to the global
// `require` with a dependency array and a callback (function or arrow). The
// rule decides by binding: a `define` / `require` imported or declared in the
// file is someone else's function, and a member call (`customElements.define`)
// is not AMD. `require('m')` with a string is CommonJS, not AMD. `allow`
// lists file globs where AMD is accepted.
module no_amd {
  type Call = DefineDepsFactory | DefineDepsArrow | DefineFactory | DefineNamed | DefineObject
    | RequireDepsCallback | RequireDepsArrow | RequireString | MemberDefine
  type Binding = Global | Local
  type Allow = NoAllow | AllowMatch | AllowOther

  pure def amd(c: Call): bool = not(Set(RequireString, MemberDefine).contains(c))

  var call: Call
  var binding: Binding
  var allow: Allow
  var verdict: bool

  action step = {
    nondet c = Set(DefineDepsFactory, DefineDepsArrow, DefineFactory, DefineNamed, DefineObject,
      RequireDepsCallback, RequireDepsArrow, RequireString, MemberDefine).oneOf()
    nondet b = Set(Global, Local).oneOf()
    nondet a = Set(NoAllow, AllowMatch, AllowOther).oneOf()
    all { call' = c, binding' = b, allow' = a,
          verdict' = (amd(c) and b == Global and a != AllowMatch) }
  }

  action init = step
}
