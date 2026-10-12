// Model of `gemini-security/no-disabled-safety-settings`: a threshold value in
// some object shape, with the SDK imported some way. The contract (rule doc):
// BLOCK_NONE / OFF disables a filter; it is a finding when it is the SDK's own
// enum (resolved through the import) or sits in the SafetySetting shape
// (a `category` beside it or a `safetySettings` list around it). A bare
// `threshold: 'OFF'` is also a circuit breaker's option.
module gemini_security_no_disabled_safety_settings {
  type Value = LiteralBlockNone | LiteralOff | EnumBlockNone | EnumOff | ConstEnumBlockNone | UnboundEnumBlockNone | EnumSafe | LiteralSafe
  type Shape = WithCategory | InSafetySettings | MappedCategories | Bare
  type ImportStyle = Named | Namespace | RequireCjs | Legacy

  var value: Value
  var shape: Shape
  var importStyle: ImportStyle
  var expected: bool

  pure def disabling(v: Value): bool =
    Set(LiteralBlockNone, LiteralOff, EnumBlockNone, EnumOff, ConstEnumBlockNone, UnboundEnumBlockNone).contains(v)

  pure def sdkEnum(v: Value): bool = Set(EnumBlockNone, EnumOff, ConstEnumBlockNone).contains(v)

  pure def shouldReport(v: Value, s: Shape, i: ImportStyle): bool =
    disabling(v) and (sdkEnum(v) or s != Bare)

  action init = all {
    nondet value0 = Set(LiteralBlockNone, LiteralOff, EnumBlockNone, EnumOff, ConstEnumBlockNone, UnboundEnumBlockNone, EnumSafe, LiteralSafe).oneOf()
    nondet shape0 = Set(WithCategory, InSafetySettings, MappedCategories, Bare).oneOf()
    nondet importStyle0 = Set(Named, Namespace, RequireCjs, Legacy).oneOf()
    all {
      value' = value0,
      shape' = shape0,
      importStyle' = importStyle0,
      expected' = shouldReport(value0, shape0, importStyle0),
    }
  }

  action step = all {
    value' = value,
    shape' = shape,
    importStyle' = importStyle,
    expected' = expected,
  }
}
