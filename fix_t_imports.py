import os
import re
import subprocess

def fix_imports():
    print("Running tsc...")
    result = subprocess.run(['npx', 'tsc', '--noEmit'], cwd='/Users/harel/APP', capture_output=True, text=True)
    
    files_to_fix = set()
    for line in result.stdout.split('\n'):
        # Match lines like "components/Reports/DetailedStatsScreen.tsx:47:16 - error TS2304: Cannot find name 't'."
        if "Cannot find name 't'" in line:
            # e.g. components/Family/FamilyMembersCard.tsx(27,21): error TS2304: Cannot find name 't'.
            match = re.search(r'^([a-zA-Z0-9_./\-]+\.tsx?)\(', line)
            if match:
                files_to_fix.add(match.group(1))

    print(f"Found {len(files_to_fix)} files missing 't' import.")
    
    for filepath in files_to_fix:
        full_path = os.path.join('/Users/harel/APP', filepath)
        if not os.path.exists(full_path):
            continue
            
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # check if it already has `import { t } from`
        if 'import { t }' not in content:
            # How many folders deep?
            depth = filepath.count('/')
            prefix = '../' * depth if depth > 0 else './'
            import_path = f"{prefix}services/i18n"
            
            # Special case for App.tsx which is in root
            if depth == 0:
                import_path = "./services/i18n"
                
            import_stmt = f"import {{ t }} from '{import_path}';\n"
            
            # Find first import or place at top
            match = re.search(r'^import\s', content, re.MULTILINE)
            if match:
                idx = match.start()
                content = content[:idx] + import_stmt + content[idx:]
            else:
                content = import_stmt + content
                
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed {filepath}")

if __name__ == "__main__":
    fix_imports()
