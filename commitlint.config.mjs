/**
 * Commitlint Configuration
 * 
 * Scopes are optional, but if provided must match one of:
 * - Nx project names (for package-specific changes)
 * - Special scopes: ci, deps, release, docs, workspace
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only changes
        'style',    // Code style (formatting, missing semi-colons, etc)
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf',     // Performance improvement
        'test',     // Adding or updating tests
        'build',    // Changes to build system or dependencies
        'ci',       // Changes to CI configuration
        'chore',    // Other changes that don't modify src or test files
        'revert'    // Reverts a previous commit
      ]
    ],
    // Scope validation: must be a valid Nx project name or special scope
    // Scopes are OPTIONAL - this rule only validates if a scope IS provided
    'scope-enum': [
      2,
      'always',
      [
        // ═══════════════════════════════════════════════════════════════
        // Nx Project Names (packages/)
        // ═══════════════════════════════════════════════════════════════
        'eslint-devkit',
        'eslint-plugin-secure-coding',
        'eslint-plugin-crypto',
        'eslint-plugin-jwt',
        'eslint-plugin-pg',
        'eslint-plugin-express-security',
        'eslint-plugin-nestjs-security',
        'eslint-plugin-browser-security',
        'eslint-plugin-lambda-security',
        'eslint-plugin-vercel-ai-security',
        'eslint-plugin-mongodb-security',
        'eslint-plugin-architecture',
        'eslint-plugin-quality',
        'eslint-plugin-react-a11y',
        'eslint-plugin-react-features',
        'eslint-plugin-import-next',
        'cli',
        // Benchmarks
        'eslint-plugin-pg-benchmark',
        'eslint-security-benchmark',
        // ═══════════════════════════════════════════════════════════════
        // Special Scopes (for non-package changes)
        // ═══════════════════════════════════════════════════════════════
        'ci',         // CI/CD workflows
        'deps',       // Dependency updates
        'release',    // Release-related changes
        'docs',       // Documentation
        'workspace',  // Workspace-wide changes
        'devkit',     // Shorthand for eslint-devkit
      ]
    ],
    // Scope is optional (empty scope allowed)
    'scope-empty': [0],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'type-empty': [2, 'never']
  }
};