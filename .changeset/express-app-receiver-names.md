---
'eslint-plugin-express-security': minor
---

Express rules agree on what an app receiver is called, and let you say

`no-permissive-trust-proxy`, `require-rate-limiting` and
`require-route-authentication` each carried a private guess at the identifier
holding the Express app, and the three had drifted apart:

    no-permissive-trust-proxy      app server router express
    require-rate-limiting          app router express api apiRouter routes
    require-route-authentication   app router express api

So `server.set('trust proxy', true)` was reported while `server.post('/login')`
next to it was not, for no reason a consumer could discover. The three now
share one list — the union of what they knew — and a new `appReceiverNames`
option replaces it, because Express creates the object by call and the name it
is assigned to was always the consumer's.
