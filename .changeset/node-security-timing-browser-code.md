---
'eslint-plugin-node-security': patch
---

fix: no-timing-unsafe-compare skips browser code

A timing oracle needs the comparison to run on a server the attacker can time. In a React, Vue, Svelte or Angular module it runs in the user's own browser: OpenWA's dashboard compares a socket event's `sessionId` with the session the user picked, and the rule reported it as a secret compare. Files that start with `'use client'`, are `.tsx`/`.jsx`/`.vue`/`.svelte`, or import a UI framework (not type-only) are now skipped; `'use server'` overrides all of them. `includeBrowserCode: true` restores the old behaviour. On the files that drew the rule's 82 reports in a 40-app scan, 30 were browser code and are now silent.
