---
'eslint-plugin-browser-security': patch
'eslint-plugin-lambda-security': patch
'eslint-plugin-react-features': patch
---

fix: deep-link, CORS, IAM and state-mutation gates read a subscripted member

`Linking['openURL'](event['url'])`, `res['setHeader']('Access-Control-Allow-Origin', '*')`,
`registry['create'](payload)` and `this.state.items['push'](x)` each do exactly
what their dotted spellings do. Seven gates across three plugins compared
`property.name` before asking what the property was.

Two more tests had pinned the miss — one describing the guard ("property is not
an Identifier"), the other the notation ("computed callee property").
