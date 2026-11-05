// Model of eslint-plugin-modularity/no-external-api-calls-in-utils.
// A utility module that calls the network cannot be tested without it; the
// client belongs in a service or is passed in. In a utility file
// (`utilityPatterns`, default **/utils/**, **/helpers/**, **/lib/**) the rule
// reports a network call - a call whose callee resolves, by binding, to an
// HTTP client:
//   - the global `fetch` (also `globalThis.fetch`);
//   - a value imported or required from one of `httpModules` (axios, got, ky,
//     node-fetch, undici, http, https, ...), called directly or through one of
//     `networkMethods` (get, post, request, ...; dotted or subscripted);
//   - a client derived from one (`const api = axios.create()`).
// It does not report:
//   - a client passed in as a parameter - dependency injection is the fix
//     the rule suggests, so `function load(axios) { axios.get(u) }` and a
//     parameter named `fetch` are not findings;
//   - a parameter that shadows an imported client in an inner scope;
//   - other methods of a client (`axios.create()`), a `Map#get`, or a
//     function imported from a non-HTTP module (lodash's `get`);
//   - a test file while `ignoreInTests` is true (the default), or any file
//     outside the utility patterns.
// `networkMethods` entries with a dot (`httpClient.get`) name an in-house
// client exactly, by the configured name.
// Left out: an UNDECLARED identifier spelled like a module (`axios.get()` with
// no import) - reported by name though nothing binds it: candidate for change
// (fires on a guess).
module no_external_api_calls_in_utils {
  type Focus = Spellings | Paths | Pairs
  type Call = GlobalFetch | GlobalThisFetch | AxiosGet | AxiosSubscript | AxiosDirect | AxiosCreated
    | RequiredHttps | NamespaceHttp | RequireDestructured
    | FetchParam | AxiosParam | InnerShadow | AxiosCreateOnly | MapGet | LodashGet | InHouseClient
  type Path = Utility | Service | UtilityTest | Shared
  type Opt = Defaults | TestsChecked | SharedPattern | ExplicitPair

  pure def networkCall(c: Call, o: Opt): bool =
    Set(GlobalFetch, GlobalThisFetch, AxiosGet, AxiosSubscript, AxiosDirect, AxiosCreated,
        RequiredHttps, NamespaceHttp, RequireDestructured).contains(c)
    or (c == InHouseClient and o == ExplicitPair)
  pure def inScope(p: Path, o: Opt): bool =
    (p == Utility and o != SharedPattern) or (p == UtilityTest and o == TestsChecked)
    or (p == Shared and o == SharedPattern)
  pure def reports(c: Call, p: Path, o: Opt): bool = networkCall(c, o) and inScope(p, o)

  var focus: Focus
  var call: Call
  var path: Path
  var opt: Opt
  var verdict: bool

  action step = {
    nondet fo = Set(Spellings, Paths, Pairs).oneOf()
    nondet c = (if (fo == Spellings) Set(GlobalFetch, GlobalThisFetch, AxiosGet, AxiosSubscript, AxiosDirect,
                                          AxiosCreated, RequiredHttps, NamespaceHttp, RequireDestructured,
                                          FetchParam, AxiosParam, InnerShadow, AxiosCreateOnly, MapGet, LodashGet)
                else if (fo == Paths) Set(AxiosGet, FetchParam)
                else Set(InHouseClient, AxiosGet)).oneOf()
    nondet p = (if (fo == Paths) Set(Utility, Service, UtilityTest, Shared) else Set(Utility)).oneOf()
    nondet o = (if (fo == Paths) Set(Defaults, TestsChecked, SharedPattern)
                else if (fo == Pairs) Set(Defaults, ExplicitPair)
                else Set(Defaults)).oneOf()
    all { focus' = fo, call' = c, path' = p, opt' = o, verdict' = reports(c, p, o) }
  }

  action init = step
}
