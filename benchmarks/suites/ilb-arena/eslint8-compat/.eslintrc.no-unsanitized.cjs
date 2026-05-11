module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["no-unsanitized"],
  rules: {
    // Mozilla's XSS prevention rules
    "no-unsanitized/method": "error",
    "no-unsanitized/property": "error",
  },
};
