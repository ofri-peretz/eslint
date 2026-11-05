// Model of eslint-plugin-modernization/no-instanceof-array.
// `value instanceof Array` is false for an array built in another realm (an
// iframe, a worker, a vm context); `Array.isArray(value)` is not. The rule
// reports an `instanceof` whose right operand is the global `Array` constructor
// - written `Array` or `globalThis.Array` - and nothing else:
//   - an `Array` the file binds itself (an import such as effect's `Array`
//     module, a parameter, a local class) is not the built-in, so checking
//     against it says nothing about realms;
//   - `Array` on the LEFT of `instanceof` tests the constructor, not a value;
//   - other constructors and `Array.isArray(...)` are the safe twins.
// `allow` (default []) silences the file when one of its entries appears in
// the source text.
module no_instanceof_array {
  type Spelling = GlobalArray | GlobalThisArray | ImportedArray | ParamArray | ArrayOnLeft | OtherClass | IsArrayCall
  type Allow = Default | Matched | Unmatched

  pure def checksBuiltinArray(s: Spelling): bool = Set(GlobalArray, GlobalThisArray).contains(s)
  pure def reports(s: Spelling, a: Allow): bool = checksBuiltinArray(s) and a != Matched

  var spelling: Spelling
  var allow: Allow
  var verdict: bool

  action step = {
    nondet s = Set(GlobalArray, GlobalThisArray, ImportedArray, ParamArray, ArrayOnLeft, OtherClass, IsArrayCall).oneOf()
    nondet a = Set(Default, Matched, Unmatched).oneOf()
    all { spelling' = s, allow' = a, verdict' = reports(s, a) }
  }

  action init = step
}
