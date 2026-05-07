module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["import"],
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".mjs", ".cjs"],
      },
    },
  },
  rules: {
    // Core import rules - these affect security through dependency hygiene
    "import/no-unresolved": "error",
    "import/no-dynamic-require": "error",
    "import/no-webpack-loader-syntax": "error",
    "import/no-self-import": "error",
    "import/no-cycle": "error",
    "import/no-useless-path-segments": "error",
    "import/no-relative-packages": "error",

    // Export/import validation
    "import/named": "error",
    "import/default": "error",
    "import/namespace": "error",
    "import/export": "error",

    // Module systems
    "import/no-commonjs": "warn",
    "import/no-amd": "error",

    // Style enforcement that catches issues
    "import/first": "error",
    "import/no-duplicates": "error",
    "import/newline-after-import": "error",
    "import/no-mutable-exports": "error",
  },
};
