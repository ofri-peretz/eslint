#!/usr/bin/env node

/**
 * Husky Setup Verification Script
 * 
 * This script verifies that Husky is properly installed and configured
 * for all developers on the team.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REQUIRED_HOOKS = ['commit-msg'];
const HUSKY_DIR = path.join(__dirname, '../.husky');
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log('\n🔍 Verifying Husky setup...\n');

let hasErrors = false;

// Check if .husky directory exists
if (!fs.existsSync(HUSKY_DIR)) {
  console.error(`${RED}✗${RESET} .husky directory not found`);
  console.log(`${YELLOW}→${RESET} Run: pnpm install`);
  hasErrors = true;
} else {
  console.log(`${GREEN}✓${RESET} .husky directory exists`);
}

// Check if required hooks exist
REQUIRED_HOOKS.forEach(hook => {
  const hookPath = path.join(HUSKY_DIR, hook);
  if (!fs.existsSync(hookPath)) {
    console.error(`${RED}✗${RESET} Hook not found: ${hook}`);
    hasErrors = true;
  } else {
    // Check if hook is executable
    try {
      fs.accessSync(hookPath, fs.constants.X_OK);
      console.log(`${GREEN}✓${RESET} Hook is executable: ${hook}`);
    } catch (err) {
      console.error(`${RED}✗${RESET} Hook is not executable: ${hook}`);
      console.log(`${YELLOW}→${RESET} Run: chmod +x ${hookPath}`);
      hasErrors = true;
    }
  }
});

// Check if commitlint config exists
const commitlintConfig = path.join(__dirname, '../commitlint.config.mjs');
if (!fs.existsSync(commitlintConfig)) {
  console.error(`${RED}✗${RESET} commitlint.config.mjs not found`);
  hasErrors = true;
} else {
  console.log(`${GREEN}✓${RESET} commitlint.config.mjs exists`);
}

// Check if git commit template is configured
try {
  const template = execSync('git config --get commit.template', { encoding: 'utf8' }).trim();
  if (template === '.gitmessage') {
    console.log(`${GREEN}✓${RESET} Git commit template is configured`);
  } else {
    console.log(`${YELLOW}⚠${RESET} Git commit template is set to: ${template}`);
    console.log(`${YELLOW}→${RESET} Run: git config commit.template .gitmessage`);
  }
} catch (err) {
  console.log(`${YELLOW}⚠${RESET} Git commit template not configured`);
  console.log(`${YELLOW}→${RESET} Run: git config commit.template .gitmessage`);
}

// Test commitlint (optional)
console.log(`\n${YELLOW}Testing commitlint...${RESET}`);
try {
  // Test with a valid message
  execSync('echo "feat: test message" | npx commitlint', { 
    stdio: 'pipe',
    encoding: 'utf8' 
  });
  console.log(`${GREEN}✓${RESET} commitlint is working correctly`);
  
  // Test with an invalid message
  try {
    execSync('echo "invalid message" | npx commitlint', { 
      stdio: 'pipe',
      encoding: 'utf8' 
    });
    console.log(`${RED}✗${RESET} commitlint failed to reject invalid message`);
    hasErrors = true;
  } catch (err) {
    console.log(`${GREEN}✓${RESET} commitlint correctly rejects invalid messages`);
  }
} catch (err) {
  console.error(`${RED}✗${RESET} commitlint test failed`);
  console.log(err.message);
  hasErrors = true;
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log(`\n${RED}✗ Husky setup has issues${RESET}`);
  console.log(`\n${YELLOW}Fix by running:${RESET}`);
  console.log(`  pnpm install`);
  console.log(`  git config commit.template .gitmessage`);
  console.log(`  chmod +x .husky/*`);
  process.exit(1);
} else {
  console.log(`\n${GREEN}✓ Husky is properly configured!${RESET}`);
  console.log(`\nYou're all set! Your commits will be validated automatically.\n`);
  process.exit(0);
}

