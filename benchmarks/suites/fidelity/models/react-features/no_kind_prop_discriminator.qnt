// Model of eslint-plugin-react-features/component-api/no-kind-prop-discriminator (R11).
// The kind-prop pattern: a prop named `type` or `kind` whose type is a union of
// two or more string literals, used to pick between rendered trees. Every
// input here proves the pattern: the component returns a different element
// for each member. Reported, however the union is written: inline, with
// `| undefined` (an optional kind), or through a type alias in the file, and
// with the key as an identifier or quoted. Not reported: `variant` (the
// documented CVA allow-list), a prop of another name, a single literal, a
// plain `string`, a union of numbers.
// Left out: candidate for change (fires on a guess): the same `type` / `kind`
// union where nothing shows it switches the tree (a role-only switch, or a
// type no component uses); the rule flags the shape alone, as its doc says.
module no_kind_prop_discriminator {
  type Name = TypeName | KindName | VariantName | ModeName
  type Key = Ident | Quoted
  type Shape = Union2 | Union3 | UnionUndef | Alias | Single | StringKw | NumUnion

  pure def reports(n: Name, k: Key, sh: Shape): bool =
    Set(TypeName, KindName).contains(n) and Set(Union2, Union3, UnionUndef, Alias).contains(sh)

  var name: Name
  var keySp: Key
  var shape: Shape
  var verdict: bool

  action step = {
    nondet n = Set(TypeName, KindName, VariantName, ModeName).oneOf()
    nondet k = Set(Ident, Quoted).oneOf()
    nondet sh = Set(Union2, Union3, UnionUndef, Alias, Single, StringKw, NumUnion).oneOf()
    all { name' = n, keySp' = k, shape' = sh, verdict' = reports(n, k, sh) }
  }

  action init = step
}
