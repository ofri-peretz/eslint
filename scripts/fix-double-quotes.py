
import os

packages_dir = '/Users/ofri/repos/ofriperetz.dev/eslint/packages'
for root, dirs, files in os.walk(packages_dir):
    for file in files:
        if file.endswith('.test.ts') or file == 'index.test.ts':
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Fix double quotes at start/end of paths
            new_content = content.replace("''../../rules/", "'../../rules/")
            new_content = new_content.replace("../../rules/''", "../../rules/'")
            # And trailing single quote if it was duplicated
            new_content = new_content.replace("/index.ts''", "/index.ts'")
            
            if new_content != content:
                print(f"Fixed quotes in {path}")
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
