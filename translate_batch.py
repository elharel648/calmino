import json
import time
from deep_translator import GoogleTranslator

def process_translations():
    translator = GoogleTranslator(source='iw', target='en')
    
    with open('/Users/harel/APP/pure_hebrew.json', 'r', encoding='utf-8') as f:
        pure_hebrew = json.load(f)
        
    hebrew_strings = list(pure_hebrew.keys())
    total = len(hebrew_strings)
    
    he_new = {}
    en_new = {}
    replace_map = {}
    
    chunk_size = 50
    print(f"Translating {total} strings in chunks of {chunk_size}...")
    
    for i in range(0, total, chunk_size):
        chunk = hebrew_strings[i:i+chunk_size]
        print(f"Processing chunk {i//chunk_size + 1}/{total//chunk_size + 1}...")
        
        try:
            english_texts = translator.translate_batch(chunk)
            
            for j, eng in enumerate(english_texts):
                idx = i + j + 1
                key = f"auto_{idx}"
                original = chunk[j]
                
                he_new[key] = original
                en_new[key] = eng if eng else ""
                replace_map[original] = key
                
        except Exception as e:
            print(f"Error on chunk {i}: {e}")
            for j, orig in enumerate(chunk):
                idx = i + j + 1
                key = f"auto_{idx}"
                he_new[key] = orig
                en_new[key] = ""
                replace_map[orig] = key
                
        time.sleep(1)
        
    with open('/Users/harel/APP/he_new.json', 'w', encoding='utf-8') as f:
        json.dump(he_new, f, ensure_ascii=False, indent=2)
        
    with open('/Users/harel/APP/en_new.json', 'w', encoding='utf-8') as f:
        json.dump(en_new, f, ensure_ascii=False, indent=2)
        
    with open('/Users/harel/APP/replace_map.json', 'w', encoding='utf-8') as f:
        json.dump(replace_map, f, ensure_ascii=False, indent=2)
        
    print("Done! Saved he_new.json, en_new.json, replace_map.json")

if __name__ == "__main__":
    process_translations()
