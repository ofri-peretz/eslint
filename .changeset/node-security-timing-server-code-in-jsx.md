---
'eslint-plugin-node-security': patch
---

fix(node-security): no-timing-unsafe-compare keeps checking server code that shares a file with JSX

The browser-code skip now leaves a file checked when it also holds server code: an exported Remix `loader` or `action`, a Next.js data or metadata function, a Next.js app-router file (a server component unless it says `'use client'`), or an inline `'use server'` action. A react import whose names are all `type` (`import { type FC } from 'react'`) no longer counts as browser code. And a plain digest of the request is the caller's only when every part of its input is: a binding that joins a server value (`const payload = req.body + pepper`) or an unknown call around the body now keeps the report. Session state read through the request (`req.session.apiToken`) is the server's, a local `String`, `JSON` or `Buffer` is not the built-in, and a literal and the body in separate `.update()` calls are judged together.
