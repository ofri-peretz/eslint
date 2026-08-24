---
'@interlace/eslint-devkit': patch
'eslint-plugin-anthropic-security': patch
'eslint-plugin-gemini-security': patch
'eslint-plugin-mcp-sdk-security': patch
'eslint-plugin-openai-security': patch
---

docs: the four AI-security plugins are documented on the site at last

Their /plugins cards 404ed and their 13 rules' `meta.docs.url` pointed at a
package that does not exist. Each plugin now has overview/changelog/rule pages
generated from its existing package docs, is registered in the devkit's
category map, and stamps canonical site URLs on export.
