// Model of eslint-plugin-jwt-security/no-sensitive-payload (CWE-359, CWE-200).
// A JWT payload is only base64-encoded: anyone holding the token reads it.
// Passwords, PII, financial data and other credentials are reported in any
// case style, inline, one const away, or spread in from a const. A whole
// record spread into the claims (`{ ...user }`) is reported too: every field
// it has goes in the token. A payload that is a parameter is not resolved.
// `additionalSensitiveFields` adds names to the list.
module no_sensitive_payload {
  type Spelling = Default | Namespace | Require | Named | Renamed | RequireDestructured | Bracket | NoImport | JoseSignJwt
  type Field =
    | Password | PasswordHash | Ssn | Email | CreditCardSnake | CreditCardKebab
    | ApiKey | RefreshToken | Sub | Role | InternalId
  type Shape = Inline | ConstPayload | SpreadOfConst | SpreadParam | SpreadQueryRow | PayloadParam

  pure def fieldShape(s: Shape): bool = Set(Inline, ConstPayload, SpreadOfConst).contains(s)

  // custom: additionalSensitiveFields: ['internalId']
  pure def sensitive(f: Field, custom: bool): bool = match f {
    | Password => true
    | PasswordHash => true
    | Ssn => true
    | Email => true
    | CreditCardSnake => true
    | CreditCardKebab => true
    | ApiKey => true
    | RefreshToken => true
    | Sub => false
    | Role => false
    | InternalId => custom
  }

  pure def reports(sp: Spelling, f: Field, s: Shape, custom: bool): bool =
    sp != NoImport and (
      if (fieldShape(s)) sensitive(f, custom)
      else s == SpreadParam or s == SpreadQueryRow
    )

  var spelling: Spelling
  var claim: Field
  var shape: Shape
  var custom: bool
  var verdict: bool

  action step = {
    nondet sp = Set(Default, Namespace, Require, Named, Renamed, RequireDestructured, Bracket, NoImport, JoseSignJwt).oneOf()
    nondet s = Set(Inline, ConstPayload, SpreadOfConst, SpreadParam, SpreadQueryRow, PayloadParam).oneOf()
    // A record shape names no field of its own.
    nondet f = (if (fieldShape(s)) Set(
      Password, PasswordHash, Ssn, Email, CreditCardSnake, CreditCardKebab,
      ApiKey, RefreshToken, Sub, Role, InternalId,
    ) else Set(Sub)).oneOf()
    nondet c = Set(true, false).oneOf()
    all {
      spelling' = sp,
      claim' = f,
      shape' = s,
      custom' = c,
      verdict' = reports(sp, f, s, c),
    }
  }

  action init = step
}
