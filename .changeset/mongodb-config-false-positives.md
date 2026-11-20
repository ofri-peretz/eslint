---
'eslint-plugin-mongodb-security': patch
---

fix(mongodb-security): no-hardcoded-connection-string ignores credential-free loopback URIs

`no-hardcoded-connection-string` is about credentials, and it reported `mongodb://localhost:27017/app`,
the default every config file writes behind an environment variable. A credential-free URI whose
hosts are all loopback (`localhost`, `127.x.x.x`, `[::1]`) is no longer reported. Credentials on a
loopback host, a remote host, and a template that supplies the host still are.
