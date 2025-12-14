#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PACKAGE_ROOT = path.join(__dirname, '../packages/eslint-plugin-secure-coding');
const OLD_RULES_DIR = path.join(PACKAGE_ROOT, 'src/rules/security');
const NEW_RULES_DIR = path.join(PACKAGE_ROOT, 'src/rules');
const TESTS_DIR = path.join(PACKAGE_ROOT, 'src/tests/security');

console.log('🔄 Starting rule reorganization (removing security subfolder)...\n');

// Check if we need to move from security subfolder
if (fs.existsSync(OLD_RULES_DIR)) {
  const ruleItems = fs.readdirSync(OLD_RULES_DIR);
  
  console.log(`Found ${ruleItems.length} items in security folder\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  ruleItems.forEach((item) => {
    const oldPath = path.join(OLD_RULES_DIR, item);
    const newPath = path.join(NEW_RULES_DIR, item);
    
    try {
      // Move the directory/file up one level
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`✅ Moved: ${item}`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Error moving ${item}:`, error.message);
      errorCount++;
    }
  });
  
  // Remove the now-empty security folder
  try {
    if (fs.existsSync(OLD_RULES_DIR)) {
      const remaining = fs.readdirSync(OLD_RULES_DIR);
      if (remaining.length === 0) {
        fs.rmdirSync(OLD_RULES_DIR);
        console.log('\n📁 Removed empty security folder');
      }
    }
  } catch (error) {
    console.log('⚠️  Could not remove security folder:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✨ Reorganization complete!`);
  console.log(`   Successfully moved: ${successCount} items`);
  console.log(`   Errors: ${errorCount}`);
  console.log('='.repeat(50));
}

// Now handle any remaining test files in tests/security
if (fs.existsSync(TESTS_DIR)) {
  console.log('\n🧪 Handling remaining test files...\n');
  
  const testFiles = fs.readdirSync(TESTS_DIR).filter(file => {
    const filePath = path.join(TESTS_DIR, file);
    return fs.statSync(filePath).isFile() && file.endsWith('.test.ts');
  });
  
  testFiles.forEach((testFile) => {
    const ruleName = testFile.replace('.test.ts', '');
    const ruleDir = path.join(NEW_RULES_DIR, ruleName);
    
    // Only move if corresponding rule directory exists
    if (fs.existsSync(ruleDir) && fs.statSync(ruleDir).isDirectory()) {
      const oldTestPath = path.join(TESTS_DIR, testFile);
      const newTestPath = path.join(ruleDir, testFile);
      
      try {
        // Update import path in test file
        let testContent = fs.readFileSync(oldTestPath, 'utf8');
        
        // Update the import statement for the rule
        // Old: import rule from '../../rules/security/rule-name';
        // New: import rule from './index';
        testContent = testContent.replace(
          new RegExp(`from ['"]../../rules/security/${ruleName}['"]`, 'g'),
          `from './index'`
        );
        testContent = testContent.replace(
          new RegExp(`from ['"]../../rules/${ruleName}['"]`, 'g'),
          `from './index'`
        );
        
        // Write updated test file to new location
        fs.writeFileSync(newTestPath, testContent);
        
        // Remove old test file
        fs.unlinkSync(oldTestPath);
        
        console.log(`✅ Moved test: ${testFile}`);
      } catch (error) {
        console.error(`❌ Error moving test ${testFile}:`, error.message);
      }
    } else {
      console.log(`⚠️  Test file without rule directory: ${testFile}`);
    }
  });
  
  // Try to clean up empty test directories
  try {
    const remainingTestFiles = fs.readdirSync(TESTS_DIR);
    if (remainingTestFiles.length === 0) {
      console.log('\n📁 Removing empty tests/security directory...');
      fs.rmdirSync(TESTS_DIR);
    } else {
      console.log(`\n⚠️  ${remainingTestFiles.length} files remain in tests/security:`);
      remainingTestFiles.forEach(file => console.log(`   - ${file}`));
    }
  } catch (error) {
    console.log('⚠️  Could not check test directory:', error.message);
  }
}

console.log('\n✅ All done!\n');
