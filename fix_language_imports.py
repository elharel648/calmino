import os
import re

def fix_language_imports():
    dirs = ['/Users/harel/APP/pages', '/Users/harel/APP/components']
    
    for d in dirs:
        for root, _, files in os.walk(d):
            for f in files:
                if f.endswith('.tsx') or f.endswith('.ts'):
                    path = os.path.join(root, f)
                    with open(path, 'r', encoding='utf-8') as file:
                        content = file.read()
                        
                    original_content = content
                    
                    # Compute relative path depth.
                    # e.g., /Users/harel/APP/components/CalmModeModal.tsx 
                    # APP/ is root. So depth = root.count('/') - '/Users/harel/APP'.count('/')
                    
                    base_dir = '/Users/harel/APP'
                    rel_path = os.path.relpath(root, base_dir)
                    depth = rel_path.count('/') + 1 if rel_path != '.' else 0
                    
                    # The right prefix
                    prefix = '../' * depth if depth > 0 else './'
                    correct_import = f"'{prefix}context/LanguageContext'"
                    
                    # Look for incorrect imports. The script previously hardcoded `../../context/LanguageContext`
                    # We will find `import { useLanguage } from '.../context/LanguageContext';`
                    # and replace the path with `correct_import`
                    
                    # Actually let's just find ANY import of useLanguage from something ending in /context/LanguageContext
                    pattern = r"from\s+['\"](.*)context/LanguageContext['\"]"
                    
                    def replacer(match):
                        current_path = match.group(1)
                        # if the path is not exactly matching what it should be, we replace it.
                        return f"from {correct_import}"
                    
                    content = re.sub(pattern, replacer, content)
                            
                    if content != original_content:
                        with open(path, 'w', encoding='utf-8') as file:
                            file.write(content)
                        print(f"Fixed useLanguage import depth in {rel_path}/{f} -> prefix {prefix}")

if __name__ == "__main__":
    fix_language_imports()
