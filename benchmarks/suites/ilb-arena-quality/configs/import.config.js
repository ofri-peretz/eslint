import importPlugin from "eslint-plugin-import";
export default [
  {
    files: ["**/*.js"],
    plugins: { import: importPlugin },
    rules: {
      "import/no-dynamic-require": "error",
      "import/no-self-import": "error",
      "import/no-cycle": "error",
      "import/no-useless-path-segments": "error",
      "import/export": "error",
      "import/no-mutable-exports": "error",
      "import/no-commonjs": "warn",
      "import/first": "error",
      "import/no-duplicates": "error",
      "import/order": "error",
    },
  },
];
