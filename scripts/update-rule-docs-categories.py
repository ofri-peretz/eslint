
import os
import re

# Mapping of plugin identifiers to categories and tags
PLUGIN_MAPPING = {
    'eslint-plugin-secure-coding': {'category': 'security', 'tags': ['security', 'core']},
    'eslint-plugin-node-security': {'category': 'security', 'tags': ['security', 'node']},
    'eslint-plugin-browser-security': {'category': 'security', 'tags': ['security', 'browser']},
    'eslint-plugin-crypto': {'category': 'security', 'tags': ['security', 'crypto']},
    'eslint-plugin-jwt': {'category': 'security', 'tags': ['security', 'jwt']},
    'eslint-plugin-vercel-ai-security': {'category': 'security', 'tags': ['security', 'ai']},
    'eslint-plugin-mongodb-security': {'category': 'security', 'tags': ['security', 'mongodb']},
    'eslint-plugin-pg': {'category': 'security', 'tags': ['security', 'postgres']},
    'eslint-plugin-lambda-security': {'category': 'security', 'tags': ['security', 'lambda']},
    'eslint-plugin-express-security': {'category': 'security', 'tags': ['security', 'express']},
    'eslint-plugin-nestjs-security': {'category': 'security', 'tags': ['security', 'nestjs']},
    'eslint-plugin-modularity': {'category': 'modularity', 'tags': ['architecture', 'modularity']},
    'eslint-plugin-modernization': {'category': 'modernization', 'tags': ['architecture', 'modernization']},
    'eslint-plugin-maintainability': {'category': 'quality', 'tags': ['quality', 'maintainability']},
    'eslint-plugin-reliability': {'category': 'quality', 'tags': ['quality', 'reliability']},
    'eslint-plugin-operability': {'category': 'quality', 'tags': ['quality', 'operability']},
    'eslint-plugin-conventions': {'category': 'quality', 'tags': ['quality', 'conventions']},
    'eslint-plugin-architecture': {'category': 'modularity', 'tags': ['architecture', 'modularity']}, # Just in case any left
}

def update_file(filepath, plugin_name):
    with open(filepath, 'r') as f:
        content = f.read()

    mapping = PLUGIN_MAPPING.get(plugin_name)
    if not mapping:
        return

    category = mapping['category']
    tags = mapping['tags']
    
    # Extract filename without extension for title
    title = os.path.splitext(os.path.basename(filepath))[0]
    
    # Try to find existing description or use title
    description_match = re.search(r'description: \'(.*?)\'', content)
    description = description_match.group(1) if description_match else title

    # Add/Update Frontmatter
    frontmatter = f"---\ntitle: {title}\ndescription: '{description}'\ncategory: {category}\ntags: {tags}\n---\n\n"
    
    if content.startswith('---'):
        # Replace existing frontmatter
        content = re.sub(r'^---.*?---', frontmatter.strip(), content, flags=re.DOTALL)
    else:
        # Prepend new frontmatter
        # Remove old # title if it exists at the top
        content = re.sub(r'^# .*?\n', '', content)
        content = frontmatter + content

    # Update Category row in Quick Summary table
    content = re.sub(r'\|\s*\*\*Category\*\*\s*\|.*?\|', f'| **Category**   | {category.capitalize()} |', content, flags=re.IGNORECASE)

    with open(filepath, 'w') as f:
        f.write(content)

base_path = '/Users/ofri/repos/ofriperetz.dev/eslint/packages'
for plugin_dir in os.listdir(base_path):
    if plugin_dir in PLUGIN_MAPPING:
        docs_rules_path = os.path.join(base_path, plugin_dir, 'docs', 'rules')
        if os.path.exists(docs_rules_path):
            for filename in os.listdir(docs_rules_path):
                if filename.endswith('.md'):
                    update_file(os.path.join(docs_rules_path, filename), plugin_dir)
                    print(f"Updated {filename} in {plugin_dir}")
