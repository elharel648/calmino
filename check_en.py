import json

def print_some(d, count=5):
    printed = 0
    for K, V in d.items():
        if isinstance(V, dict):
            printed += print_some(V, count - printed)
        else:
            print(f"{K}: {V}")
            printed += 1
        if printed >= count:
            break
    return printed

en = json.load(open('locales/en.json'))
print_some(en, 20)

