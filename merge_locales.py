import json
import os

def merge_locales():
    with open('/Users/harel/APP/he_new.json', 'r', encoding='utf-8') as f:
        he_new = json.load(f)
        
    with open('/Users/harel/APP/en_new.json', 'r', encoding='utf-8') as f:
        en_new = json.load(f)
        
    # Merge into he.json
    he_path = '/Users/harel/APP/locales/he.json'
    with open(he_path, 'r', encoding='utf-8') as f:
        he_json = json.load(f)
    he_json.update(he_new)
    with open(he_path, 'w', encoding='utf-8') as f:
        json.dump(he_json, f, ensure_ascii=False, indent=2)
        
    # Merge into en.json
    en_path = '/Users/harel/APP/locales/en.json'
    with open(en_path, 'r', encoding='utf-8') as f:
        en_json = json.load(f)
    en_json.update(en_new)
    with open(en_path, 'w', encoding='utf-8') as f:
        json.dump(en_json, f, ensure_ascii=False, indent=2)
        
    # Merge English fallback into all other languages
    other_langs = ['ar.json', 'de.json', 'es.json', 'fr.json']
    for lang in other_langs:
        lang_path = os.path.join('/Users/harel/APP/locales', lang)
        if os.path.exists(lang_path):
            with open(lang_path, 'r', encoding='utf-8') as f:
                lang_json = json.load(f)
            lang_json.update(en_new)
            with open(lang_path, 'w', encoding='utf-8') as f:
                json.dump(lang_json, f, ensure_ascii=False, indent=2)
                
    print("All loc files updated successfully!")

if __name__ == "__main__":
    merge_locales()
