// Model of eslint-plugin-modularity/enforce-rest-conventions.
// The rule's one finding is "resource should be plural": a static route path
// whose first segment does not end in `s` (`/user`) on a route registration
// (`app.get` / `router.post` / ..., dotted or subscripted). Whether a path
// segment is a singular noun is a guess from its spelling - `/health`,
// `/login`, `/search` and `/me` name no resource collection - so every input
// where that guess decides is left out: candidate for change (fires on a
// guess). What remains is the contract the rule can keep without guessing,
// all silent:
//   - a path with a route parameter (`/users/:id`), a plural path, the root
//     `/`, and a path the code builds at run time;
//   - a singular path while `checkResourceNaming` is false.
// `checkStatusCodes` and `checkHttpMethods` decide nothing (the status check
// is an empty stub, and every listed method is a valid REST method).
module enforce_rest_conventions {
  type Method = Get | Post | Delete | GetSubscript
  type Path = WithParam | Plural | Root | Dynamic | Singular
  type Opt = Defaults | NamingOff | StatusOff | MethodsOff

  var method: Method
  var path: Path
  var opt: Opt
  var verdict: bool

  action step = {
    nondet m = Set(Get, Post, Delete, GetSubscript).oneOf()
    nondet o = Set(Defaults, NamingOff, StatusOff, MethodsOff).oneOf()
    nondet p = (if (o == NamingOff) Set(WithParam, Plural, Root, Dynamic, Singular)
                else Set(WithParam, Plural, Root, Dynamic)).oneOf()
    all { method' = m, path' = p, opt' = o, verdict' = false }
  }

  action init = step
}
