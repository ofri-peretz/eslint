
import os
import re

def fix_imports(file_path, plugin_name):
    with open(file_path, 'r') as f:
        content = f.read()

    new_content = content
    
    # Mapping old pseudofolders to new special folders
    replaces = [
        ('../../rules/quality/', '../../rules/maintainability/'),
        ('../../rules/development/', '../../rules/conventions/'),
        ('../../rules/error-handling/', '../../rules/error-handling/'), # no change but just in case
        ('../../rules/reliability/', '../../rules/reliability/'),
    ]

    if plugin_name == 'eslint-plugin-maintainability':
        # maintainability only has rules/maintainability now
        new_content = new_content.replace('../../rules/quality/', '../../rules/maintainability/') 
        new_content = new_content.replace('../../rules/development/', '../../rules/maintainability/')
    
    elif plugin_name == 'eslint-plugin-conventions':
        new_content = new_content.replace('../../rules/quality/', '../../rules/conventions/')
        new_content = new_content.replace('../../rules/development/', '../../rules/conventions/')
        new_content = new_content.replace('../../rules/deprecation/', '../../rules/deprecation/')

    elif plugin_name == 'eslint-plugin-operability':
        new_content = new_content.replace('../../rules/quality/', '../../rules/operability/')
        new_content = new_content.replace('../../rules/development/', '../../rules/operability/')
        # Case where it imports from ./index in src/tests/operability/rule.test.ts
        if '/src/tests/operability/' in file_path:
            def replace_index(match):
                rule_name = os.path.basename(file_path).replace('.test.ts', '')
                return f"from '../../rules/operability/{rule_name}'"
            new_content = re.sub(r"from [\'\"]\./index[\'\"]", replace_index, new_content)

    elif plugin_name == 'eslint-plugin-reliability':
        # Reliability has reliability and error-handling subfolders
        def replace_reliability_rel(match):
            rule_name = match.group(1)
            # Check reliability vs error-handling
            pkg_base = '/Users/ofri/repos/ofriperetz.dev/eslint/packages/eslint-plugin-reliability/src/rules'
            rel_path = os.path.join(pkg_base, 'reliability', f'{rule_name}.ts')
            err_path = os.path.join(pkg_base, 'error-handling', f'{rule_name}.ts')
            
            if os.path.exists(rel_path):
                return f"../../rules/reliability/{rule_name}"
            elif os.path.exists(err_path):
                return f"../../rules/error-handling/{rule_name}"
            return match.group(0).strip("'\"")

        new_content = re.sub(r'\.\./\.\./rules/(?:quality|development|error-handling|reliability)/(.*?)[\'\"]', lambda m: f"'{replace_reliability_rel(m)}'", new_content)
        
        # Fixed specific require-network-timeout.test.ts
        if file_path.endswith('require-network-timeout.test.ts'):
             new_content = new_content.replace("from './index'", "from '../../rules/reliability/require-network-timeout'")

    # Fix bracket access for all plugins that might need it
    if plugin_name in ['eslint-plugin-modularity', 'eslint-plugin-modernization', 'eslint-plugin-reliability', 'eslint-plugin-conventions', 'eslint-plugin-operability', 'eslint-plugin-maintainability']:
        new_content = new_content.replace('configs.recommended', "configs['recommended']")
        new_content = new_content.replace('configs.strict', "configs['strict']")

    if new_content != content:
        with open(file_path, 'w') as f:
            f.write(new_content)
        return True
    return False

packages = [
    'eslint-plugin-maintainability',
    'eslint-plugin-conventions',
    'eslint-plugin-reliability',
    'eslint-plugin-operability',
    'eslint-plugin-modularity',
    'eslint-plugin-modernization'
]

base_path = '/Users/ofri/repos/ofriperetz.dev/eslint/packages'
for pkg in packages:
    pkg_path = os.path.join(base_path, pkg, 'src')
    if not os.path.exists(pkg_path):
        continue
    for root, dirs, files in os.walk(pkg_path):
        for file in files:
            if file.endswith('.test.ts') or file == 'index.test.ts':
                if fix_imports(os.path.join(root, file), pkg):
                    print(f"Fixed {pkg}/{file}")

# Final cleanup of double rules/rules
def final_cleanup():
    for pkg in packages:
        pkg_path = os.path.join(base_path, pkg, 'src')
        if not os.path.exists(pkg_path): continue
        for root, dirs, files in os.walk(pkg_path):
            for file in files:
                if file.endswith('.ts'):
                    fpath = os.path.join(root, file)
                    with open(fpath, 'r') as f:
                        c = f.read()
                    nc = c.replace("../../rules/../../rules/", "../../rules/")
                    if nc != c:
                        with open(fpath, 'w') as f:
                            f.write(nc)
final_cleanup()
