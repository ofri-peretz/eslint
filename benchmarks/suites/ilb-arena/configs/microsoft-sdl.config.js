/**
 * ESLint Configuration for @microsoft/eslint-plugin-sdl
 * Microsoft Security Development Lifecycle
 * 17 rules focused on XSS, cookies, eval, document.write, etc.
 */

import sdl from "@microsoft/eslint-plugin-sdl";

// SDL recommended is a flat config array
export default [...sdl.configs.recommended];
