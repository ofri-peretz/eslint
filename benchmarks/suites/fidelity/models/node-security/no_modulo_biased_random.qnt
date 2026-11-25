// Model of eslint-plugin-node-security/no-modulo-biased-random (CWE-330).
// A random element reduced with % n is biased unless n divides the element's
// range (256 for a byte, 2^32 for a Uint32Array word) or n is at least the
// range. The rule reports such a % when its result picks a position (an
// index) and the element is not rejection-sampled (compared with < in the
// same function).
// Sources: crypto.randomBytes (default and named import), the global
// crypto.getRandomValues on a Uint8Array or Uint32Array, and a Uint8Array
// filled in place. Not sources: Buffer.from, a local function that shadows
// randomBytes. Elements are read by index, for...of, an Array.from(...).map
// callback, or an Array.from(c, cb) callback.
// Divisors: 10 and the length of a const 70-character string divide neither
// range; 16 and 256 divide both (256 is also not below a byte's range); an
// unknown parameter is reported. A % that is summed instead of used as a
// position is not reported.
module no_modulo_biased_random {
  type Source = RandomBytes | NamedImport | WebU8 | WebU32 | FilledInPlace | NotRandom | Shadowed
  type Access = Index | ForOf | MapCallback | FromCallback
  type Divisor = D10 | D16 | Len70 | Unknown | D256
  type Use = Position | Sum
  type Guard = NoGuard | Rejection

  pure def isRandom(s: Source): bool =
    Set(RandomBytes, NamedImport, WebU8, WebU32, FilledInPlace).contains(s)

  pure def biased(d: Divisor): bool = Set(D10, Len70, Unknown).contains(d)

  pure def reports(s: Source, a: Access, d: Divisor, u: Use, g: Guard): bool =
    isRandom(s) and biased(d) and u == Position and g == NoGuard

  var source: Source
  var access: Access
  var divisor: Divisor
  var use: Use
  var guard: Guard
  var verdict: bool

  action step = {
    nondet s = Set(RandomBytes, NamedImport, WebU8, WebU32, FilledInPlace, NotRandom, Shadowed).oneOf()
    nondet a = Set(Index, ForOf, MapCallback, FromCallback).oneOf()
    nondet d = Set(D10, D16, Len70, Unknown, D256).oneOf()
    nondet u = Set(Position, Sum).oneOf()
    nondet g = Set(NoGuard, Rejection).oneOf()
    all {
      source' = s, access' = a, divisor' = d, use' = u, guard' = g,
      verdict' = reports(s, a, d, u, g),
    }
  }

  action init = step
}
