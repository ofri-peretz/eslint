---
'eslint-plugin-browser-security': patch
---

A flag is not a credential.

`no-jwt-in-storage` reported `sessionStorage.setItem(AUTO_SSO_ATTEMPTED_KEY, '1')`
— a flag meaning single sign-on had already been attempted once. The key names
`auth`, so the key heuristic fired; the value is the string `"1"`.

Found on IGNF/cartes.gouv.fr-entree-carto, a French government mapping site that
runs this plugin. It was one of five false positives that repository's maintainers
were being shown.

The key half of this rule is a heuristic by design — it reports because the key
names a credential, not because it saw one. That is the right default and it stays.
What it cannot survive is a value the code writes in front of it: nobody stores a
JWT as `"1"`. A literal boolean, number, or one of the words that spell them
(`true`, `false`, `yes`, `no`, `on`, `off`, `null`, `undefined`) is now proof the
value is not a bearer credential, whatever the key is called.

Deliberately narrow. A short opaque string like `'a1b2c3'` is NOT exempt, because
that could be a real secret and the exemption has to be unarguable rather than
generous. The value check still runs first, so a literal JWT reports however
innocuous the key is spelled.
