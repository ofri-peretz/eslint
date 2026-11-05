// Model of eslint-plugin-react-features/prefer-es6-class.
// The legacy `createClass` factory is reported however the code reaches it:
// `React.createClass` (default or namespace import, computed member, the UMD
// global `React`) and `create-react-class`, the package it moved to, under
// any local name (import or require). A local function or a non-React object
// with a `createClass` method is not the factory.
// Left out: a bare `createReactClass(...)` the file never declares or imports
// (the module is unknown; the rule keeps reading it by name).
module prefer_es6_class {
  type Spelling = ReactDefault | ReactNamespace | ReactComputed | ReactUmd | CrcImport
                | CrcRenamed | CrcRequire | LocalFn | LocalReact
  pure def reports(sp: Spelling): bool = not(Set(LocalFn, LocalReact).contains(sp))

  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet sp = Set(ReactDefault, ReactNamespace, ReactComputed, ReactUmd, CrcImport,
                    CrcRenamed, CrcRequire, LocalFn, LocalReact).oneOf()
    all { spelling' = sp, verdict' = reports(sp) }
  }

  action init = step
}
