// Model of eslint-plugin-react-features/react-in-jsx-scope.
// Under the classic JSX runtime every element and fragment compiles to
// `React.createElement` / `React.Fragment`, so a variable named `React` must
// be in scope wherever JSX appears: a default or namespace import, a require,
// or any other value binding named `React`. Missing: no binding, only named
// imports from 'react', a type-only import (erased at compile time), or React
// imported under another name. JSX inside a component counts the same as JSX
// at module level. A file that declares the automatic runtime
// (`/** @jsxRuntime automatic */`) needs no React, and a file with no JSX is
// silent.
// Left out: a custom `@jsx` pragma (then that factory, not React, must be in
// scope).
module react_in_jsx_scope {
  type Binding = DefaultImport | NamespaceImport | Require | LocalVar | NamedOnly
               | TypeOnly | NoBinding | OtherName
  type Jsx = TopLevel | InComponent | Fragment | NoJsx
  type Pragma = Classic | Automatic

  pure def inScope(b: Binding): bool =
    Set(DefaultImport, NamespaceImport, Require, LocalVar).contains(b)
  pure def reports(b: Binding, j: Jsx, p: Pragma): bool =
    j != NoJsx and p == Classic and not(inScope(b))

  var binding: Binding
  var jsx: Jsx
  var pragma: Pragma
  var verdict: bool

  action step = {
    nondet b = Set(DefaultImport, NamespaceImport, Require, LocalVar, NamedOnly, TypeOnly,
                   NoBinding, OtherName).oneOf()
    nondet j = Set(TopLevel, InComponent, Fragment, NoJsx).oneOf()
    nondet p = Set(Classic, Automatic).oneOf()
    all { binding' = b, jsx' = j, pragma' = p, verdict' = reports(b, j, p) }
  }

  action init = step
}
