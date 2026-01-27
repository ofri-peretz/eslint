const fs = require('fs');
const path = require('path');

// Plugin categorization
const securityPlugins = [
  'browser-security', 'crypto', 'express-security', 'jwt', 'lambda-security',
  'mongodb-security', 'nestjs-security', 'node-security', 'pg', 'secure-coding',
  'vercel-ai-security'
];

const qualityPlugins = [
  'conventions', 'maintainability', 'modernization', 'modularity', 
  'operability', 'reliability', 'react-features', 'react-a11y', 'import-next'
];

// Parse existing frontmatter properly
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, body: content };
  
  const frontmatterStr = match[1];
  const body = content.slice(match[0].length);
  
  const frontmatter = {};
  let currentKey = null;
  let currentValue = '';
  
  for (const line of frontmatterStr.split('\n')) {
    // Check if this is a new key-value pair
    const keyMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);
    if (keyMatch) {
      // Save previous key-value if exists
      if (currentKey) {
        frontmatter[currentKey] = parseValue(currentValue.trim());
      }
      currentKey = keyMatch[1];
      currentValue = keyMatch[2];
    } else if (currentKey && line.startsWith('  ')) {
      // Continuation of multiline value
      currentValue += '\n' + line;
    }
  }
  
  // Save last key-value
  if (currentKey) {
    frontmatter[currentKey] = parseValue(currentValue.trim());
  }
  
  return { frontmatter, body };
}

function parseValue(value) {
  // Handle quoted strings
  if ((value.startsWith("'") && value.endsWith("'")) || 
      (value.startsWith('"') && value.endsWith('"'))) {
    return value.slice(1, -1);
  }
  
  // Handle arrays - keep as string for YAML output
  if (value.startsWith('[')) {
    return value;
  }
  
  // Handle booleans
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  return value;
}

// Generate frontmatter string
function generateFrontmatter(fm) {
  const lines = ['---'];
  
  // Order of fields
  const order = [
    'title', 'description', 'category', 'severity', 'tags', 'autofix',
    // Security fields
    'cwe', 'cve', 'owasp', 'owaspMobile',
    // Quality fields
    'principle', 'pattern', 'cleanCode', 'cognitiveComplexity', 'affects', 'effort'
  ];
  
  for (const key of order) {
    if (fm[key] !== undefined && fm[key] !== '') {
      let value = fm[key];
      
      // Format value for YAML
      if (typeof value === 'string') {
        // Check if it's already a formatted array
        if (value.startsWith('[')) {
          // Keep as-is
        } else if (value.includes(':') || value.includes("'") || value.includes('"') || value.includes('\n')) {
          // Quote strings with special characters
          value = `"${value.replace(/"/g, '\\"')}"`;
        }
      } else if (typeof value === 'boolean') {
        value = value.toString();
      } else if (Array.isArray(value)) {
        value = "['" + value.join("', '") + "']";
      }
      
      lines.push(`${key}: ${value}`);
    }
  }
  
  lines.push('---');
  return lines.join('\n');
}

// Determine tags based on plugin and rule name
function generateTags(plugin, ruleName, isSecurityPlugin, existingTags) {
  // If tags already exist, keep them
  if (existingTags && existingTags.length > 0) {
    return existingTags;
  }
  
  const tags = [];
  
  if (isSecurityPlugin) {
    tags.push('security');
    if (plugin.includes('jwt')) tags.push('jwt');
    if (plugin.includes('node')) tags.push('nodejs');
    if (plugin.includes('browser')) tags.push('browser');
  } else {
    tags.push('quality');
    if (plugin.includes('maintainability')) tags.push('maintainability');
    if (plugin.includes('react')) tags.push('react');
    if (plugin.includes('a11y')) tags.push('accessibility');
  }
  
  return tags;
}

// Determine severity
function determineSeverity(plugin, ruleName, isSecurityPlugin, existingSeverity) {
  if (existingSeverity) return existingSeverity;
  
  if (isSecurityPlugin) {
    if (ruleName.includes('injection') || ruleName.includes('xss') || ruleName.includes('eval')) {
      return 'critical';
    }
    return 'medium';
  }
  return 'low';
}

// Update a single file
function updateFile(filePath, plugin, ruleName) {
  if (!fs.existsSync(filePath)) return false;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const { frontmatter, body } = parseFrontmatter(content);
  
  const isSecurityPlugin = securityPlugins.includes(plugin);
  
  // Only update/add missing fields, preserve existing ones
  if (!frontmatter.title) frontmatter.title = ruleName;
  // Keep existing description!
  if (!frontmatter.description) frontmatter.description = `${ruleName} rule`;
  
  if (!frontmatter.category) {
    frontmatter.category = isSecurityPlugin ? 'security' : 'quality';
  }
  
  if (!frontmatter.severity) {
    frontmatter.severity = determineSeverity(plugin, ruleName, isSecurityPlugin, null);
  }
  
  if (!frontmatter.tags) {
    frontmatter.tags = "['" + generateTags(plugin, ruleName, isSecurityPlugin, null).join("', '") + "']";
  }
  
  if (!frontmatter.autofix) {
    frontmatter.autofix = isSecurityPlugin ? 'false' : 'suggestions';
  }
  
  // Add quality-specific fields if not security and not already present
  if (!isSecurityPlugin) {
    if (!frontmatter.affects) {
      frontmatter.affects = "['readability', 'maintainability']";
    }
    if (!frontmatter.effort) {
      frontmatter.effort = 'low';
    }
  }
  
  // Generate new content
  const newFrontmatter = generateFrontmatter(frontmatter);
  const newContent = newFrontmatter + body;
  
  fs.writeFileSync(filePath, newContent);
  return true;
}

// Main execution
function main() {
  const allPlugins = [...securityPlugins, ...qualityPlugins];
  let updated = 0;
  let skipped = 0;
  
  for (const plugin of allPlugins) {
    const pkgDocsDir = `packages/eslint-plugin-${plugin}/docs/rules`;
    const appDocsDir = `apps/docs/content/docs/${plugin}/rules`;
    
    const rules = new Set();
    
    if (fs.existsSync(pkgDocsDir)) {
      fs.readdirSync(pkgDocsDir).forEach(f => {
        if (f.endsWith('.md') && f !== 'index.md') rules.add(f.replace('.md', ''));
      });
    }
    
    if (fs.existsSync(appDocsDir)) {
      fs.readdirSync(appDocsDir).forEach(f => {
        if (f.endsWith('.mdx') && f !== 'index.mdx') rules.add(f.replace('.mdx', ''));
      });
    }
    
    for (const rule of rules) {
      const mdPath = path.join(pkgDocsDir, `${rule}.md`);
      const mdxPath = path.join(appDocsDir, `${rule}.mdx`);
      
      if (updateFile(mdPath, plugin, rule)) updated++;
      else skipped++;
      
      if (updateFile(mdxPath, plugin, rule)) updated++;
      else skipped++;
    }
    
    console.log(`✅ ${plugin}: processed ${rules.size} rules`);
  }
  
  console.log(`\nTotal: ${updated} files updated, ${skipped} skipped`);
}

main();
