import os
import re
import json

def apply_translations():
    with open('/Users/harel/APP/replace_map.json', 'r', encoding='utf-8') as f:
        replace_map = json.load(f)
        
    print(f"Loaded {len(replace_map)} mapping rules.")
    
    # Sort by length descending
    sorted_map = sorted(replace_map.items(), key=lambda x: len(x[0]), reverse=True)
    
    dirs = ['/Users/harel/APP/pages', '/Users/harel/APP/components']
    
    for d in dirs:
        for root, _, files in os.walk(d):
            for f in files:
                if f.endswith('.tsx') or f.endswith('.ts'):
                    path = os.path.join(root, f)
                    with open(path, 'r', encoding='utf-8') as file:
                        content = file.read()
                        
                    original_content = content
                    
                    for hebrew, key in sorted_map:
                        if hebrew not in content:
                            continue
                            
                        # 1. JSX Text >Hebrew< -> >{t('key')}<
                        content = content.replace(f">{hebrew}<", f">{{t('{key}')}}<")
                        
                        # 2. JSX Props: placeholder="Hebrew" -> placeholder={t('key')}
                        # Pattern matches any attribute name before the equals sign
                        escaped_heb = re.escape(hebrew)
                        content = re.sub(r'([a-zA-Z0-9_]+)="' + escaped_heb + r'"', r'\1={t("' + key + r'")}', content)
                        content = re.sub(r"([a-zA-Z0-9_]+)='" + escaped_heb + r"'", r"\1={t('" + key + r"')}", content)
                        
                        # 3. Object prop: label: "Hebrew" -> label: t('key')
                        content = re.sub(r'([a-zA-Z0-9_]+):\s*"' + escaped_heb + r'"', r'\1: t("' + key + r'")', content)
                        content = re.sub(r"([a-zA-Z0-9_]+):\s*'" + escaped_heb + r"'", r"\1: t('" + key + r"')", content)
                        
                        # 4. array items ["hebrew"] -> [t('key')] (simplified)
                        content = re.sub(r'\[\s*"' + escaped_heb + r'"\s*\]', r'[t("' + key + r'")]', content)
                        content = re.sub(r"\[\s*'" + escaped_heb + r"'\s*\]", r"[t('" + key + r"')]", content)

                        # 5. Ternary or logical returns: ? "hebrew" : 'hebrew'
                        content = re.sub(r'\?\s*"' + escaped_heb + r'"', r'? t("' + key + r'")', content)
                        content = re.sub(r"\?\s*'" + escaped_heb + r"'", r"? t('" + key + r"')", content)
                        content = re.sub(r':\s*"' + escaped_heb + r'"', r': t("' + key + r'")', content)
                        content = re.sub(r":\s*'" + escaped_heb + r"'", r": t('" + key + r"')", content)
                        content = re.sub(r'\|\|\s*"' + escaped_heb + r'"', r'|| t("' + key + r'")', content)
                        content = re.sub(r"\|\|\s*'" + escaped_heb + r"'", r"|| t('" + key + r"')", content)

                        # Replace within alert or log, just plain function call arguments
                        content = re.sub(r'\(\s*"' + escaped_heb + r'"', r'(t("' + key + r'")', content)
                        content = re.sub(r"\(\s*'" + escaped_heb + r"'", r"(t('" + key + r"')", content)
                        content = re.sub(r',\s*"' + escaped_heb + r'"', r', t("' + key + r'")', content)
                        content = re.sub(r",\s*'" + escaped_heb + r"'", r", t('" + key + r"')", content)

                    if content != original_content:
                        # Ensure useLanguage hook
                        if 'useLanguage' not in content:
                            import_path = "../../context/LanguageContext" if '/components/' in path else "../context/LanguageContext"
                            imports_end = content.rfind('import ')
                            if imports_end != -1:
                                newline_after = content.find('\n', imports_end)
                                content = content[:newline_after+1] + f"import {{ useLanguage }} from '{import_path}';\n" + content[newline_after+1:]
                            else:
                                content = f"import {{ useLanguage }} from '{import_path}';\n" + content
                                
                        if 'const { t }' not in content and 'const {t}' not in content:
                            theme_match = re.search(r'const\s*\{\s*theme.*\}\s*=\s*useTheme\(\);[ \t]*\n?', content)
                            if theme_match:
                                content = content.replace(theme_match.group(0), theme_match.group(0) + f"    const {{ t }} = useLanguage();\n")
                            else:
                                comp_match = re.search(r'(const\s+\w+\s*[:=].*(?:React\.FC|=>)\s*\{?\s*\n)', content)
                                if comp_match:
                                    content = content.replace(comp_match.group(0), comp_match.group(0) + f"  const {{ t }} = useLanguage();\n")
                                else:
                                    func_match = re.search(r'(export\s+(?:default\s+)?function\s+\w+\s*\([^\)]*\)\s*\{\s*\n)', content)
                                    if func_match:
                                        content = content.replace(func_match.group(0), func_match.group(0) + f"  const {{ t }} = useLanguage();\n")

                        with open(path, 'w', encoding='utf-8') as file:
                            file.write(content)
                        print(f"Updated {f}")

if __name__ == "__main__":
    apply_translations()
