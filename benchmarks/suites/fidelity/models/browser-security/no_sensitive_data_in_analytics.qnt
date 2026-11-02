// Model of eslint-plugin-browser-security/no-sensitive-data-in-analytics (CWE-359).
// A PII-named key in an object literal passed to analytics.track() reports.
// Keys match sensitiveFields as WHOLE camel/snake/kebab segments, never as
// substrings; a configured list REPLACES the defaults.
module no_sensitive_data_in_analytics {
  type Key =
    | Email
    | EmailShorthand
    | UserEmailCamel
    | UserEmailSnake
    | UserEmailKebab
    | EmailsSent
    | CreditCardCamel
    | CreditCardSnake
    | CardNumber
    | Ssn
    | Password
    | Phone
    | Phoneme
    | Address
    | Addressable
    | Dob
    | Page
    | LoyaltyTierCamel
    | LoyaltyTierSnake
    | LoyaltyTierKebabUpper
  type Sink = Track | WindowTrack | ComputedTrack

  pure def defaultSensitive(k: Key): bool = match k {
    | Email => true
    | EmailShorthand => true
    | UserEmailCamel => true
    | UserEmailSnake => true
    | UserEmailKebab => true
    | CreditCardCamel => true
    | CreditCardSnake => true
    | CardNumber => true
    | Ssn => true
    | Password => true
    | Phone => true
    | Address => true
    | Dob => true
    | _ => false
  }

  pure def customSensitive(k: Key): bool = match k {
    | LoyaltyTierCamel => true
    | LoyaltyTierSnake => true
    | LoyaltyTierKebabUpper => true
    | _ => false
  }

  pure def reports(k: Key, s: Sink, custom: bool): bool =
    if (custom) customSensitive(k) else defaultSensitive(k)

  var key: Key
  var sink: Sink
  var custom: bool
  var verdict: bool

  action step = {
    nondet k = Set(Email, EmailShorthand, UserEmailCamel, UserEmailSnake, UserEmailKebab, EmailsSent, CreditCardCamel, CreditCardSnake, CardNumber, Ssn, Password, Phone, Phoneme, Address, Addressable, Dob, Page, LoyaltyTierCamel, LoyaltyTierSnake, LoyaltyTierKebabUpper).oneOf()
    nondet s = Set(Track, WindowTrack, ComputedTrack).oneOf()
    nondet c = Set(true, false).oneOf()
    all { key' = k, sink' = s, custom' = c, verdict' = reports(k, s, c) }
  }

  action init = step
}
