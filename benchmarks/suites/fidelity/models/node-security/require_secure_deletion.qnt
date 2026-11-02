// Model of eslint-plugin-node-security/require-secure-deletion (CWE-459).
// `delete` of a statically known property whose name ENDS in a sensitive word
// (password, token, api key, private key, ...; camel, snake or SCREAMING case)
// is reported, via dot, literal subscript or optional chaining. A name whose
// last word is not sensitive (tokenCount, tokenizer, cacheable) and a dynamic
// key are not. additionalSensitiveProperties ['pin code'] adds pinCode but not
// pincode.
module require_secure_deletion {
  type Name = Password | RefreshToken | ApiKeySnake | AccessTokenUpper | PrivateKey | TokenCount | Tokenizer | Cacheable | PinCode | Pincode
  type Access = Dot | LiteralSubscript | Optional | DynamicKey

  pure def sensitive(n: Name, extraPin: bool): bool = match n {
    | Password => true
    | RefreshToken => true
    | ApiKeySnake => true
    | AccessTokenUpper => true
    | PrivateKey => true
    | PinCode => extraPin
    | _ => false
  }

  pure def reports(n: Name, a: Access, extraPin: bool): bool =
    a != DynamicKey and sensitive(n, extraPin)

  var name: Name
  var access: Access
  var extraPin: bool
  var verdict: bool

  action step = {
    nondet n = Set(Password, RefreshToken, ApiKeySnake, AccessTokenUpper, PrivateKey, TokenCount, Tokenizer, Cacheable, PinCode, Pincode).oneOf()
    nondet a = Set(Dot, LiteralSubscript, Optional, DynamicKey).oneOf()
    nondet x = Set(true, false).oneOf()
    all { name' = n, access' = a, extraPin' = x, verdict' = reports(n, a, x) }
  }

  action init = step
}
