// Model of eslint-plugin-modularity/enforce-naming.
// A project's glossary maps a discouraged term to its domain term
// (`user` -> `customer`). With `terms` configured, the rule reports a name the
// file DECLARES - a variable, function, class, class property or method -
// that contains a discouraged term: a string term matches as a
// case-insensitive substring, a RegExp term by `test`. It does not report:
//   - any name while `terms` is empty (the default);
//   - names the file only references - an imported binding, a member read on
//     another object - whose spelling belongs to someone else's API.
// Left out (judgment): parameters, destructured bindings and type-level
// declarations (interfaces, type aliases, enums) - the docs do not say
// whether the glossary covers them.
module enforce_naming {
  type Terms = NoTerms | StringTerm | RegexTerm
  type Site = VarDecl | FunctionDecl | ClassDecl | PropertyDecl | MethodDecl | ImportedRef | MemberRead
  type Name = LowerMatch | UpperMatch | NoMatch

  pure def declares(s: Site): bool =
    Set(VarDecl, FunctionDecl, ClassDecl, PropertyDecl, MethodDecl).contains(s)
  pure def reports(t: Terms, s: Site, n: Name): bool =
    t != NoTerms and declares(s) and n != NoMatch

  var terms: Terms
  var site: Site
  var name: Name
  var verdict: bool

  action step = {
    nondet t = Set(NoTerms, StringTerm, RegexTerm).oneOf()
    nondet s = Set(VarDecl, FunctionDecl, ClassDecl, PropertyDecl, MethodDecl, ImportedRef, MemberRead).oneOf()
    nondet n = Set(LowerMatch, UpperMatch, NoMatch).oneOf()
    all { terms' = t, site' = s, name' = n, verdict' = reports(t, s, n) }
  }

  action init = step
}
