// Model of eslint-plugin-import-next/namespace (import/namespace).
// Reading a name off a namespace import that the module does not export is
// reported: `import * as ns from './dep'` then `ns.missing`, `ns['missing']`
// or `const { missing } = ns`. Names the module exports are fine.
// Decided by binding: `ns` must be the namespace import itself - a default
// import named `ns`, or a parameter `ns` shadowing the import, is another
// value. Silent: a runtime key `ns[k]`; a module that does not resolve.
// Needs type information; without it the rule is silent.
module namespace {
  type Binding = NamespaceImport | DefaultImport | Shadowed
  type Access = Dot | BracketLit | Dynamic | Destructure
  type Name = Exists | Missing
  type Resolution = Resolved | Unresolved

  pure def reports(b: Binding, a: Access, n: Name, r: Resolution): bool = and {
    b == NamespaceImport, r == Resolved, n == Missing,
    Set(Dot, BracketLit, Destructure).contains(a),
  }

  var binding: Binding
  var access: Access
  var name: Name
  var resolution: Resolution
  var verdict: bool

  action step = {
    nondet b = Set(NamespaceImport, DefaultImport, Shadowed).oneOf()
    nondet a = Set(Dot, BracketLit, Dynamic, Destructure).oneOf()
    nondet n = Set(Exists, Missing).oneOf()
    nondet r = Set(Resolved, Unresolved).oneOf()
    all { binding' = b, access' = a, name' = n, resolution' = r,
          verdict' = reports(b, a, n, r) }
  }

  action init = step
}
