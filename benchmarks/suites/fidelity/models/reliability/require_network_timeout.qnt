// Model of eslint-plugin-reliability/require-network-timeout (CWE-400).
// A network request with no bound on how long it may wait can hang forever and
// hold its socket. The rule reports a request the file shows to be unbounded:
// a `fetch` call or an axios request whose options carry neither a `timeout`
// nor an abort `signal`. Which call it is decides it, by structure:
//   - `fetch` is the global (also `globalThis.fetch`); a local function that
//     shadows the name is not a network call;
//   - axios is the binding imported or required from 'axios' under any name, or
//     the global `axios` (a page loading it from a CDN); a local object named
//     `axios` is not the library. It is called as a
//     function, through a method (dotted or `['get']`), or through `request`;
//     its config sits in the slot the method defines: 2nd for get/delete, 3rd
//     for post (the 2nd is the request BODY, so a `timeout` field in it bounds
//     nothing), 1st for `axios(config)` / `axios.request(config)`;
//   - `axios.create` and `axios.isCancel` send nothing.
// The options decide the bound: an inline object or a `const`-bound object
// literal the reader can see either has the key or does not. Options the file
// cannot see (a parameter, a spread of one) prove nothing, so they are silent.
module require_network_timeout {
  type Client = Fetch | GlobalThisFetch | ShadowedFetch | AxiosGet | AxiosPost | AxiosPostBodyTimeout
              | AxiosDelete | AxiosRequest | AxiosCall | AxiosRenamed | AxiosRequire | AxiosBracket
              | AxiosGlobal | AxiosLocalObject | AxiosCreate | AxiosIsCancel | NotNetwork
  type Bound = NoOptions | Timeout | Signal | QuotedTimeout | OtherKeys | ConstNoBound | ConstBound
             | Opaque | SpreadOpaque

  pure def request(c: Client): bool =
    not(Set(ShadowedFetch, AxiosLocalObject, AxiosCreate, AxiosIsCancel, NotNetwork).contains(c))
  pure def unbounded(b: Bound): bool = Set(NoOptions, OtherKeys, ConstNoBound).contains(b)
  pure def reports(c: Client, b: Bound): bool = request(c) and unbounded(b)

  var client: Client
  var bound: Bound
  var verdict: bool

  action step = {
    nondet c = Set(Fetch, GlobalThisFetch, ShadowedFetch, AxiosGet, AxiosPost, AxiosPostBodyTimeout,
                   AxiosDelete, AxiosRequest, AxiosCall, AxiosRenamed, AxiosRequire, AxiosBracket,
                   AxiosGlobal, AxiosLocalObject, AxiosCreate, AxiosIsCancel, NotNetwork).oneOf()
    nondet b = Set(NoOptions, Timeout, Signal, QuotedTimeout, OtherKeys, ConstNoBound, ConstBound,
                   Opaque, SpreadOpaque).oneOf()
    all { client' = c, bound' = b, verdict' = reports(c, b) }
  }

  action init = step
}
