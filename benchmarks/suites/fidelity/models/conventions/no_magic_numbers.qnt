// Model of eslint-plugin-conventions/no-magic-numbers.
// A numeric literal used directly in logic hides its meaning; the rule
// reports it. Each structural exemption has an option, sampled at its default
// and flipped:
//   - Plain (a call argument, a comparison): reported; `ignore: [n]` allows n.
//   - Negative: `-42` is the number -42, so `ignore: [-42]` allows it.
//   - ArrayIndex `items[42]`:            ignoreArrayIndexes (default true)
//   - ObjectValue `{ timeout: 42 }`:     detectObjects (default false)
//   - LoopBound `for (...; i < 42; ...)`: ignoreLoopBounds (default true)
//   - LengthCompare `xs.length === 42`:  ignoreLengthComparisons (default true)
//   - DefaultValue `(x = 42) => ...`:    ignoreDefaultValues (default true)
//   - EnumMember `enum E { A = 42 }`:    ignoreEnums (default true)
//   - Bitwise `flags & 42`:              ignoreBitwiseExpressions (default false)
//   - NumericArray `[42, 43]`:           ignoreNumericArrays (default true)
//   - ConstArithmetic `const MS = 42 * 1000`: namedConstArithmetic (default true)
// Never reported: a literal that initialises a named variable (`const retries
// = 42` - the name carries the meaning), a numeric object key, and the
// structural allowlist 0, 1, 2, -1 (`Small`) anywhere.
module no_magic_numbers {
  type Site = Plain | Negative | ArrayIndex | ObjectValue | LoopBound | LengthCompare
    | DefaultValue | EnumMember | Bitwise | NumericArray | ConstArithmetic | NamedDecl | NumericKey
  type Value = Small | Magic

  // Whether the site is exempt at the option's default (`flip` = false) or
  // at its non-default value (`flip` = true).
  pure def exempt(s: Site, flip: bool): bool =
    if (Set(Plain, Negative, Bitwise).contains(s)) flip
    else if (Set(NamedDecl, NumericKey).contains(s)) true
    else not(flip)

  pure def reports(s: Site, flip: bool, v: Value): bool = v == Magic and not(exempt(s, flip))

  var site: Site
  var flip: bool
  var value: Value
  var verdict: bool

  action step = {
    nondet s = Set(Plain, Negative, ArrayIndex, ObjectValue, LoopBound, LengthCompare, DefaultValue,
                   EnumMember, Bitwise, NumericArray, ConstArithmetic, NamedDecl, NumericKey).oneOf()
    nondet f = Set(false, true).oneOf()
    nondet v = Set(Small, Magic).oneOf()
    all { site' = s, flip' = f, value' = v, verdict' = reports(s, f, v) }
  }

  action init = step
}
