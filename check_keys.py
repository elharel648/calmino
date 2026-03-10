import json

def get_keys(d, p=''):
    k = []
    for K, V in d.items():
        if isinstance(V, dict):
            k.extend(get_keys(V, p + K + '.'))
        else:
            k.append(p + K)
    return k

he = json.load(open('locales/he.json'))
en = json.load(open('locales/en.json'))
he_k = set(get_keys(he))
en_k = set(get_keys(en))
missing = he_k - en_k
print('Missing in en.json:', len(missing))
print('Sample missing:', list(missing)[:20])

ar = json.load(open('locales/ar.json'))
ar_k = set(get_keys(ar))
missing_ar = he_k - ar_k
print('Missing in ar.json:', len(missing_ar))

