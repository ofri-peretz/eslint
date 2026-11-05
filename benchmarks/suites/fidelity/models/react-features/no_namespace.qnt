// Model of eslint-plugin-react-features/no-namespace.
// The documented contract: a namespace import (`import * as X from 'm'`)
// brings in a module's whole export object, which the docs say defeats tree
// shaking; named or default imports are the alternative. Reported: a value
// namespace import, from React or any other module.
// Not reported: named and default imports; `import type * as T`, which
// TypeScript erases (there is nothing to bundle); `export * as ns from 'm'`,
// a re-export rather than an import.
// Left out: `await import('m')`, which the docs do not cover.
module no_namespace {
  type Kind = NsReact | NsLocal | NsType | Named | Default | ExportNs

  pure def reports(k: Kind): bool = k == NsReact or k == NsLocal

  var kind: Kind
  var verdict: bool

  action step = {
    nondet k = Set(NsReact, NsLocal, NsType, Named, Default, ExportNs).oneOf()
    all { kind' = k, verdict' = reports(k) }
  }

  action init = step
}
