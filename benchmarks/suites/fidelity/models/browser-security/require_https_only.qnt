// Model of eslint-plugin-browser-security/require-https-only (CWE-319).
// An http:// URL literal (any scheme case; a template with no expressions is a
// literal) as the URL argument of fetch() / window.fetch() /
// axios.get|post|put|delete|patch|head|options() reports. https:// does not,
// nor does an http:// URL handed to some other client.
module require_https_only {
  type Call =
    | Fetch
    | WindowFetch
    | AxiosGet
    | AxiosPost
    | AxiosPut
    | AxiosDelete
    | AxiosPatch
    | AxiosHead
    | AxiosOptions
    | AxiosComputedGet
    | OtherGet
  type Url = Http | Https | HttpUpper | HttpTplStatic | HttpsTplStatic

  pure def reports(c: Call, u: Url): bool =
    c != OtherGet and (u == Http or u == HttpUpper or u == HttpTplStatic)

  var call: Call
  var url: Url
  var verdict: bool

  action step = {
    nondet c = Set(Fetch, WindowFetch, AxiosGet, AxiosPost, AxiosPut, AxiosDelete, AxiosPatch, AxiosHead, AxiosOptions, AxiosComputedGet, OtherGet).oneOf()
    nondet u = Set(Http, Https, HttpUpper, HttpTplStatic, HttpsTplStatic).oneOf()
    all { call' = c, url' = u, verdict' = reports(c, u) }
  }

  action init = step
}
