import { execSync } from 'child_process';

/**
 * Commitlint Configuration
 * 
 * Scopes are optional, but if provided must match one of:
 * - Nx project names (dynamically loaded from workspace)
 * - Special scopes: ci, deps, release, docs, workspace
 */

// ═══════════════════════════════════════════════════════════════
// Dynamically load Nx project names
// ═══════════════════════════════════════════════════════════════
function getNxProjectNames() {
  try {
    const output = execSync('pnpm nx show projects', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'] // Suppress stderr
    });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.warn('⚠️ Could not load Nx projects for commitlint scope validation');
    // Fallback to empty array - scopes will not be validated
    return [];
  }
}

const nxProjects = getNxProjectNames();

// Special scopes for non-package changes
const specialScopes = [
  'ci',         // CI/CD workflows
  'deps',       // Dependency updates
  'release',    // Release-related changes
  'docs',       // Documentation
  'workspace',  // Workspace-wide changes
];

// Combine all valid scopes
const validScopes = [...nxProjects, ...specialScopes];

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
      validScopes
    ],
    // Scope is optional (empty scope allowed)
    'scope-empty': [0],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'type-empty': [2, 'never']
  }
};