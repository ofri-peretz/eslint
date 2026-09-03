# Sidebar Visibility & Plugin Exclusions

This standard codifies which plugins should be visible in the documentation sidebar and which should be excluded.

## 1. Published Plugins (Visible)

The following plugins are public and MUST be included in the `apps/docs/content/docs/meta.json` pages list:

### Security Category

- `secure-coding`
- `pg`
- `jwt`
- `crypto`
- `browser-security`
- `mongodb-security`
- `vercel-ai-security`

### Frameworks Category

- `express-security`
- `nestjs-security`
- `lambda-security`

### Architecture Category

- `import-next`

## 2. Excluded Plugins (Hidden)

The following plugins are currently hidden from the sidebar. DO NOT add them to the top-level `meta.json` until they are explicitly marked as "Published" in `apps/docs/src/data/plugin-stats.json`.

- `architecture` (Internal/Experimental)
- `quality` (Internal/Experimental)
- `react-a11y` (In Pipeline)
- `react-features` (In Pipeline)

## 3. Navigation Structure

The main index for each plugin should be titled **"Overview"** in the sidebar. This is achieved by:

1. Setting `title: Overview` in the frontmatter of `README.mdx` (or `index.mdx`).
2. Mapping the filename to the sidebar in `meta.json`.

Example `meta.json` for a plugin:

```json
{
  "title": "secure-coding",
  "pages": ["README", "changelog", "rules"]
}
```

## 4. Pipeline Display

Hidden plugins may still appear in the "In the Pipeline" section on the home page if they have `"published": false` in `plugin-stats.json`. Sidebar exclusion is focused on the core documentation navigation.
