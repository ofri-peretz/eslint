import os
import re

PACKAGES_DIR = 'packages'
TARGET_COLUMNS = ['Rule', 'CWE', 'OWASP', 'CVSS', 'Description', '💼', '⚠️', '🔧', '💡', '🚫']

def standardize_table(table_text):
    lines = table_text.strip().split('\n')
    if len(lines) < 3:
        return table_text

    header = lines[0]
    separator = lines[1]
    rows = lines[2:]

    # Parse header to find column indices
    header_cells = [c.strip() for c in header.split('|')[1:-1]]
    col_map = {}
    for i, cell in enumerate(header_cells):
        cell_lower = cell.lower()
        if 'rule' in cell_lower: col_map['Rule'] = i
        elif 'cwe' in cell_lower: col_map['CWE'] = i
        elif 'owasp' in cell_lower: col_map['OWASP'] = i
        elif 'cvss' in cell_lower: col_map['CVSS'] = i
        elif 'description' in cell_lower: col_map['Description'] = i
        elif '💼' in cell or 'recommended' in cell_lower: col_map['💼'] = i
        elif '⚠️' in cell or 'warn' in cell_lower: col_map['⚠️'] = i
        elif '🔧' in cell or 'fixable' in cell_lower: col_map['🔧'] = i
        elif '💡' in cell or 'suggestion' in cell_lower: col_map['💡'] = i
        elif '🚫' in cell or 'deprecated' in cell_lower: col_map['🚫'] = i

    # If it doesn't look like a rules table, return as is
    if 'Rule' not in col_map:
        return table_text

    new_header = '| ' + ' | '.join(TARGET_COLUMNS) + ' |'
    # Alignments: Rule (left), CWE/OWASP/CVSS (center), Description (left), Icons (center)
    alignments = [':---', ':---:', ':---:', ':---:', ':---', ':---:', ':---:', ':---:', ':---:', ':---:']
    new_separator = '| ' + ' | '.join(alignments) + ' |'

    new_rows = []
    for row in rows:
        cells = [c.strip() for c in row.split('|')[1:-1]]
        if not cells: continue
        
        new_row_cells = []
        for col in TARGET_COLUMNS:
            idx = col_map.get(col)
            val = cells[idx] if idx is not None and idx < len(cells) else ''
            
            # Special case for icons: if the column wasn't in the original table, 
            # check if the row contains the icon anywhere
            if idx is None and col in ['💼', '⚠️', '🔧', '💡', '🚫']:
                if col in row:
                    val = col
            
            new_row_cells.append(val)
        
        new_rows.append('| ' + ' | '.join(new_row_cells) + ' |')

    return '\n'.join([new_header, new_separator] + new_rows)

def process_readme(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to find tables
    # Matches a table starting with | Rule | ...
    table_pattern = re.compile(r'(\| Rule[^\n]*\|\n\|[-:| ]+\|\n(?:\|[^\n]*\|\n?)+)', re.IGNORECASE)
    
    def replace_table(match):
        return standardize_table(match.group(1))

    new_content = table_pattern.sub(replace_table, content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Standardized: {filepath}")
    else:
        print(f"No changes for: {filepath}")

def main():
    for root, dirs, files in os.walk(PACKAGES_DIR):
        if 'README.md' in files:
            process_readme(os.path.join(root, 'README.md'))

if __name__ == '__main__':
    main()
