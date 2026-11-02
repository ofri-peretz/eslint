// Model of eslint-plugin-node-security/detect-suspicious-dependencies (CWE-506).
// Contract (docs): a package specifier whose package name is within 2 edits
// (Levenshtein) of a popular package (react, lodash, express, axios, webpack)
// but not equal to it is reported, in every import spelling (import, require,
// dynamic import, export-from). The package name of a subpath specifier is its
// first segment. Exact names, scoped packages, relative paths, node: builtins
// and unrelated names are fine. CWE-506 is embedded MALICIOUS code: an
// established legitimate package that happens to sit near a popular name
// (preact, 1 edit from react) is not a typosquat, so it is silent. (The doc's
// "When Not To Use It" implies such names are flagged; the doc is the thing
// that is incomplete there, not the rule.)
module detect_suspicious_dependencies {
  type Name = Exact | Typo1 | Transposed | Deletion | SubpathExact | SubpathTypo
            | Scoped | Relative | Builtin | Unrelated | NearLegit | FarSimilar
  type Spelling = EsmImport | Require | DynamicImport | ExportFrom

  pure def suspicious(n: Name): bool = match n {
    | Exact => false
    | Typo1 => true
    | Transposed => true
    | Deletion => true
    | SubpathExact => false
    | SubpathTypo => true
    | Scoped => false
    | Relative => false
    | Builtin => false
    | Unrelated => false
    | NearLegit => false
    | FarSimilar => false
  }

  var name: Name
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet n = Set(Exact, Typo1, Transposed, Deletion, SubpathExact, SubpathTypo, Scoped,
                   Relative, Builtin, Unrelated, NearLegit, FarSimilar).oneOf()
    nondet s = Set(EsmImport, Require, DynamicImport, ExportFrom).oneOf()
    all { name' = n, spelling' = s, verdict' = suspicious(n) }
  }

  action init = step
}
