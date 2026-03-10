import os
import re

def fix_duplicate_t():
    dirs = ['/Users/harel/APP/pages', '/Users/harel/APP/components']
    
    for d in dirs:
        for root, _, files in os.walk(d):
            for f in files:
                if f.endswith('.tsx') or f.endswith('.ts'):
                    path = os.path.join(root, f)
                    with open(path, 'r', encoding='utf-8') as file:
                        content = file.read()
                        
                    original_content = content
                    
                    # Find all `const { t } = useLanguage();` exact matches with any spacing
                    exact_t_pattern = r'[ \t]*const\s+\{\s*t\s*\}\s*=\s*useLanguage\(\);[ \t]*\n?'
                    
                    # If we find this exact line AND another useLanguage() that brings in `t`
                    matches = list(re.finditer(r'const\s+\{([^}]+)\}\s*=\s*useLanguage\(\);', content))
                    
                    has_other_t = False
                    for m in matches:
                        extracted = m.group(1).strip()
                        vars_extracted = [v.strip().split(':')[0].strip() for v in extracted.split(',')]
                        if 't' in vars_extracted and vars_extracted != ['t']:
                            has_other_t = True
                            
                    if has_other_t:
                        # Remove the EXACT `const { t } = useLanguage();` lines
                        content = re.sub(exact_t_pattern, '', content)
                            
                    if content != original_content:
                        with open(path, 'w', encoding='utf-8') as file:
                            file.write(content)
                        print(f"Fixed duplicate `t` in {f}")

if __name__ == "__main__":
    fix_duplicate_t()
