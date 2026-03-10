import os

hebrew_chars = [chr(i) for i in range(0x0590, 0x0600)]

def contains_hebrew(text):
    return any(c in text for c in hebrew_chars)

total = 0
for d in ['/Users/harel/APP/pages', '/Users/harel/APP/components']:
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith('.tsx') or f.endswith('.ts'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    lines = file.readlines()
                    for i, line in enumerate(lines):
                        if contains_hebrew(line) and not line.strip().startswith('//') and 'console.log' not in line:
                            total += 1
                            print(f"{path}:{i+1}:{line.strip()}")

print(f"Total lines with Hebrew: {total}")
