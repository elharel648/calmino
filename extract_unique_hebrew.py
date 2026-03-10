import os
import re

hebrew_chars = [chr(i) for i in range(0x0590, 0x0600)]

def contains_hebrew(text):
    return any(c in text for c in hebrew_chars)

strings = set()

# Naive extraction of string literals and JSX text
for d in ['/Users/harel/APP/pages', '/Users/harel/APP/components']:
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith('.tsx') or f.endswith('.ts'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                    
                    # 1. matches "..." and '...'
                    for match in re.findall(r'["\']([^"\']*)["\']', content):
                        if contains_hebrew(match):
                            strings.add(match)
                            
                    # 2. matches JSX text >...<
                    for match in re.findall(r'>([^<]*)<', content):
                        cleaned = match.strip()
                        if contains_hebrew(cleaned) and not cleaned.startswith('{'):
                            strings.add(cleaned)
                            
                    # 3. matches template literals `...`
                    for match in re.findall(r'`([^`]*)`', content):
                        if contains_hebrew(match):
                            # strip out ${...} naively for the dictionary
                            cleaned = re.sub(r'\$\{.*?\}', '{}', match).strip()
                            strings.add(cleaned)

print(f"Total unique Hebrew strings: {len(strings)}")

# write to file so I can read it
with open('unique_hebrew_strings.txt', 'w', encoding='utf-8') as f:
    for s in sorted(list(strings)):
        f.write(s + '\n')
