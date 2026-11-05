// Model of eslint-plugin-maintainability/identical-functions (CWE-1104).
// Two functions in one file with the same implementation are duplicated
// logic. The rule reports a function whose body matches another's when the
// body spans at least `minLines` (default 3) lines. Whitespace, line breaks
// and comments are not part of the implementation: a reformatted copy is the
// same body. Every function form counts: declarations, arrows bound to a
// `const`, class methods, and a declaration paired with an arrow.
// Two clearly different bodies are not reported.
//   - `similarityThreshold` (default 0.9): identical bodies match at any
//     threshold, so it is sampled at 1 (exact matches only) to pin that.
//   - `ignoreTestFiles` (default true): a test file (`*.test.*`) is skipped.
//   - `ignoreGeneratedFiles` (default true): a file whose leading comment
//     declares it generated (`@generated`) is skipped.
// Left out (judgment): near-duplicates between identical and different, whose
// verdict depends on the similarity metric.
module identical_functions {
  type Pair = DeclDecl | ArrowArrow | MethodMethod | DeclArrow
  type Body = Identical | Reformatted | Different | ShortIdentical
  type Opts = Defaults | MinLinesOne | ExactOnly
  type File = Prod | TestFile | Generated

  pure def duplicated(b: Body, o: Opts): bool =
    b == Identical or b == Reformatted or (b == ShortIdentical and o == MinLinesOne)
  pure def reports(b: Body, o: Opts, f: File, it: bool, ig: bool): bool =
    duplicated(b, o) and not(f == TestFile and it) and not(f == Generated and ig)

  var pair: Pair
  var body: Body
  var opts: Opts
  var file: File
  var ignoreTestFiles: bool
  var ignoreGeneratedFiles: bool
  var verdict: bool

  action step = {
    nondet p = Set(DeclDecl, ArrowArrow, MethodMethod, DeclArrow).oneOf()
    nondet b = Set(Identical, Reformatted, Different, ShortIdentical).oneOf()
    nondet o = Set(Defaults, MinLinesOne, ExactOnly).oneOf()
    nondet f = Set(Prod, TestFile, Generated).oneOf()
    nondet it = Set(false, true).oneOf()
    nondet ig = Set(false, true).oneOf()
    all {
      pair' = p, body' = b, opts' = o, file' = f, ignoreTestFiles' = it, ignoreGeneratedFiles' = ig,
      verdict' = reports(b, o, f, it, ig),
    }
  }

  action init = step
}
