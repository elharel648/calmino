import os
import re
import json

hebrew_chars = [chr(i) for i in range(0x0590, 0x0600)]

def contains_hebrew(text):
    return any(c in text for c in hebrew_chars)

strings = set()

for d in ['/Users/harel/APP/pages', '/Users/harel/APP/components']:
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith('.tsx') or f.endswith('.ts'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                    
                    # 1. JSX text >...<
                    for match in re.findall(r'>([^<]*[\u0590-\u05FF][^<]*)<', content):
                        cleaned = match.strip()
                        if cleaned and '{' not in cleaned and '}' not in cleaned: # ignore interpolations for now
                            strings.add(cleaned)
                            
                    # 2. String literals "..." or '...'
                    for match in re.findall(r'["\']([^"\']*[\u0590-\u05FF][^"\']*)["\']', content):
                        if '{' not in match and '}' not in match:
                            strings.add(match)
                            
                    # 3. Handle interpolation manually if needed, or skip complex ones
                    
print(f"Total pure Hebrew strings: {len(strings)}")

strings_dict = {s: "" for s in sorted(list(strings))}
with open('/Users/harel/APP/pure_hebrew.json', 'w', encoding='utf-8') as f:
    json.dump(strings_dict, f, ensure_ascii=False, indent=2)

