import json

def check_hebrew(d):
    count = 0
    for K, V in d.items():
        if isinstance(V, dict):
            count += check_hebrew(V)
        else:
            if isinstance(V, str) and any('\u0590' <= c <= '\u05FF' for c in V):
                count += 1
    return count

for fn in ['locales/en.json', 'locales/ar.json', 'locales/fr.json', 'locales/es.json', 'locales/de.json', 'locales/he.json']:
    try:
        d = json.load(open(fn))
        c = check_hebrew(d)
        print(f"{fn}: {c} hebrew strings out of {len(str(d).split(','))}")
    except Exception as e:
        print(fn, e)

