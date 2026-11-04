// Model of eslint-plugin-gemini-security/no-disabled-safety-settings (CWE-693).
// A harm-category threshold of BLOCK_NONE or OFF switches Gemini's content
// filter off for that category. The value counts as written as a string, as
// the SDK's HarmBlockThreshold member (dotted, string-subscripted, renamed or
// through a namespace / require of @google/genai or @google/generative-ai),
// or through a same-file const holding either. Real thresholds
// (BLOCK_MEDIUM_AND_ABOVE, BLOCK_ONLY_HIGH, BLOCK_LOW_AND_ABOVE, the
// UNSPECIFIED default) are not findings. Because `threshold: 'OFF'` is also
// a circuit breaker or a log level, a string or a look-alike enum counts only
// in the SDK's SafetySetting shape (a `category` beside it, or inside a
// `safetySettings: [...]` list); the SDK's own enum member counts anywhere.
// A file with no Gemini import is not judged.
module no_disabled_safety_settings {
  type Part = Values | Shapes | Gates
  type Value =
    | StrBlockNone | StrOff | EnumBlockNone | EnumOff | BracketEnum
    | ConstStr | ConstEnum | LookalikeOff | StrMedium | EnumOnlyHigh
    | StrLowAbove | StrUnspecified
  type Shape = InConfig | CategoryOnly | ArrayNoCategory | InRequest | Lone
  type Gate = Named | Namespace | Renamed | Require | Legacy | NoImport

  pure def disabling(v: Value): bool = match v {
    | StrBlockNone => true
    | StrOff => true
    | EnumBlockNone => true
    | EnumOff => true
    | BracketEnum => true
    | ConstStr => true
    | ConstEnum => true
    | LookalikeOff => true
    | _ => false
  }
  pure def sdkEnum(v: Value): bool =
    v == EnumBlockNone or v == EnumOff or v == BracketEnum or v == ConstEnum
      or v == EnumOnlyHigh
  pure def gemini(g: Gate): bool = g != NoImport

  pure def reports(v: Value, s: Shape, g: Gate): bool =
    gemini(g) and disabling(v) and (sdkEnum(v) or s != Lone)

  var part: Part
  var value: Value
  var shape: Shape
  var gate: Gate
  var verdict: bool

  action step = {
    nondet pt = Set(Values, Shapes, Gates).oneOf()
    nondet v = (if (pt == Values) Set(
      StrBlockNone, StrOff, EnumBlockNone, EnumOff, BracketEnum, ConstStr,
      ConstEnum, LookalikeOff, StrMedium, EnumOnlyHigh, StrLowAbove,
      StrUnspecified,
    ) else Set(StrBlockNone, EnumOff, StrMedium)).oneOf()
    nondet s = (if (pt == Shapes) Set(
      InConfig, CategoryOnly, ArrayNoCategory, InRequest, Lone,
    ) else Set(InConfig, Lone)).oneOf()
    nondet g = (if (pt == Gates) Set(
      Named, Namespace, Renamed, Require, Legacy, NoImport,
    ) else Set(Named)).oneOf()
    all {
      part' = pt,
      value' = v,
      shape' = s,
      gate' = g,
      verdict' = reports(v, s, g),
    }
  }

  action init = step
}
