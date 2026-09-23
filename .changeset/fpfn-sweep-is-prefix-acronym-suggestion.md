---
'eslint-plugin-react-features': patch
---

fix: `no-is-prefix-prop` suggested renaming `isTTY` to `tTY`

`stripIsPrefix` lowercased exactly one character after the `is` prefix, so a prop whose name continues with an acronym got a suggestion nobody would accept: `isTTY` → `tTY`, `isURL` → `uRL`, `isID` → `iD`. This shipped as an APPLYABLE suggestion with a concrete fix range, so accepting it wrote the mangled name into the source. The leading run of capitals is now lowered as a whole, except a trailing capital that begins the next word, which has to survive — and a capital begins a word only when a lowercase letter follows it: `isTTY` → `tty`, `isURLPath` → `urlPath`, `isURL2FA` → `url2FA`.
