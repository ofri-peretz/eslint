<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Modernize JavaScript to ES2022+ syntax with AI-assisted guidance.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-modernization" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-modernization.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-modernization" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-modernization.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
</p>

## Description

This plugin helps migrate legacy JavaScript code to modern ES2022+ syntax. It detects outdated patterns and provides AI-parseable fix guidance, enabling developers and AI assistants to modernize codebases safely and consistently.

## Philosophy

**Interlace** fosters **strength through integration**. Code modernization shouldn't be a one-time effort — it should be continuous. These rules catch legacy patterns as they're written, preventing technical debt accumulation.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/modernization), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-modernization --save-dev
```

## ⚙️ Configuration Presets

| Preset        | Description                                      |
| :------------ | :----------------------------------------------- |
| `recommended` | Balanced modernization for most projects         |
| `strict`      | All rules as errors for aggressive modernization |

---

## 🏢 Usage Example

```js
// eslint.config.js
import modernization from 'eslint-plugin-modernization';

export default [
  modernization.configs.recommended,

  // Or be strict about modernization
  // modernization.configs.strict,
];
```

---

## Rules

| Rule                                                       | Description                                              | 💼  | ⚠️  |
| :--------------------------------------------------------- | :------------------------------------------------------- | :-: | :-: |
| [no-instanceof-array](./docs/rules/no-instanceof-array.md) | Prefer `Array.isArray()` over `instanceof Array`         | 💼  |     |
| [prefer-at](./docs/rules/prefer-at.md)                     | Prefer `Array.at()` for negative index access            | 💼  | ⚠️  |
| [prefer-event-target](./docs/rules/prefer-event-target.md) | Prefer `EventTarget` over `EventEmitter` in browser code | 💼  | ⚠️  |

**Legend**: 💼 Recommended | ⚠️ Warns (not error)

---

## Why These Rules?

### `no-instanceof-array`

`instanceof Array` fails across different realms (iframes, workers). `Array.isArray()` is the correct, reliable check.

```js
// ❌ Bad: Fails across realms
if (value instanceof Array) {
}

// ✅ Good: Works everywhere
if (Array.isArray(value)) {
}
```

### `prefer-at`

`Array.at()` provides cleaner negative index access (ES2022+).

```js
// ❌ Bad: Verbose negative index access
const last = arr[arr.length - 1];

// ✅ Good: Clean ES2022+ syntax
const last = arr.at(-1);
```

### `prefer-event-target`

`EventTarget` is the native browser API and doesn't require Node.js polyfills.

```js
// ❌ Bad: Requires polyfill in browsers
import { EventEmitter } from 'events';

// ✅ Good: Native browser API
const target = new EventTarget();
```

---

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native quality plugins with LLM-optimized error messages:

| Plugin                                                                                                               | Description                         |
| :------------------------------------------------------------------------------------------------------------------- | :---------------------------------- |
| [`@interlace/eslint-plugin-maintainability`](https://www.npmjs.com/package/@interlace/eslint-plugin-maintainability) | Cognitive complexity & code quality |
| [`eslint-plugin-modularity`](https://www.npmjs.com/package/eslint-plugin-modularity)                                 | DDD patterns & architecture rules   |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
