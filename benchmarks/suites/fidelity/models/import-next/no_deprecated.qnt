// Model of eslint-plugin-import-next/no-deprecated (import/no-deprecated).
// Using an API its declaration marks deprecated is reported. The mark is a
// JSDoc `@deprecated` tag (or a marker from `deprecationMarkers`, which ADDS
// to `@deprecated`), or a `@deprecated` decorator. `checkJSDoc: false`
// ignores JSDoc marks, `checkDecorators: false` decorator marks; a name in
// `allow` is never reported.
//   - Declared in THIS file: each use of the binding is reported (`new Old()`,
//     `const v = Old`). Decided by binding: a parameter named `Old`, or an
//     object key `{ Old: 1 }`, is not the deprecated item; a declaration
//     nobody uses is not a finding.
//   - Imported (`import { Old }`, `import { Old as O2 }`): the import itself
//     depends on the deprecated export and is reported, used or not. Through
//     a namespace (`import * as m`), each `m.Old` read is reported, and a
//     parameter `m` shadowing it is another value.
// Imports are judged with type information (the rule reads the other module
// through TypeScript); without it the other module is unknown: silent.
module no_deprecated {
  type Where = Local | ImportNamed | ImportRenamed | ImportNamespace
  type Mark = JsDoc | Custom | Decorator | NoMark
  type Usage = New | Reference | Shadowed | ObjectKey | NoUse
  type Opts = Defaults | AllowListed | JsDocOff | DecoratorsOff | CustomMarker

  pure def deprecated(m: Mark, o: Opts): bool = or {
    m == JsDoc and o != JsDocOff,
    m == Custom and o == CustomMarker,
    m == Decorator and o != DecoratorsOff,
  }
  pure def used(w: Where, u: Usage): bool =
    if (w == ImportNamed or w == ImportRenamed) true
    else Set(New, Reference).contains(u)
  pure def reports(w: Where, m: Mark, u: Usage, o: Opts): bool =
    deprecated(m, o) and used(w, u) and o != AllowListed

  var where: Where
  var mark: Mark
  var usage: Usage
  var opts: Opts
  var verdict: bool

  action step = {
    nondet w = Set(Local, ImportNamed, ImportRenamed, ImportNamespace).oneOf()
    nondet m = Set(JsDoc, Custom, Decorator, NoMark).oneOf()
    nondet u = Set(New, Reference, Shadowed, ObjectKey, NoUse).oneOf()
    nondet o = Set(Defaults, AllowListed, JsDocOff, DecoratorsOff, CustomMarker).oneOf()
    all { where' = w, mark' = m, usage' = u, opts' = o, verdict' = reports(w, m, u, o) }
  }

  action init = step
}
