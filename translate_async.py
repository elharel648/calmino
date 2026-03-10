import json
import asyncio
import aiohttp
from urllib.parse import quote

async def translate_text(session, text, sem):
    async with sem:
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=iw&tl=en&dt=t&q={quote(text)}"
        try:
            async with session.get(url, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    # Google translate returns a nested array where data[0] contains pairs of [translated, original]
                    translated = "".join([part[0] for part in data[0]])
                    return translated
                else:
                    print(f"Error {response.status} for text '{text}'")
                    return ""
        except Exception as e:
            print(f"Exception for text '{text}': {e}")
            return ""

async def main():
    with open('/Users/harel/APP/pure_hebrew.json', 'r', encoding='utf-8') as f:
        pure_hebrew = json.load(f)
        
    hebrew_strings = list(pure_hebrew.keys())
    total = len(hebrew_strings)
    print(f"Starting async translation of {total} strings...")
    
    sem = asyncio.Semaphore(20) # Max 20 concurrent requests
    
    async with aiohttp.ClientSession() as session:
        tasks = [translate_text(session, text, sem) for text in hebrew_strings]
        results = await asyncio.gather(*tasks)
        
    he_new = {}
    en_new = {}
    replace_map = {}
    
    for i, hebrew_text in enumerate(hebrew_strings):
        idx = i + 1
        key = f"auto_{idx}"
        translated = results[i]
        
        he_new[key] = hebrew_text
        en_new[key] = translated if translated else ""
        replace_map[hebrew_text] = key
        
    with open('/Users/harel/APP/he_new.json', 'w', encoding='utf-8') as f:
        json.dump(he_new, f, ensure_ascii=False, indent=2)
        
    with open('/Users/harel/APP/en_new.json', 'w', encoding='utf-8') as f:
        json.dump(en_new, f, ensure_ascii=False, indent=2)
        
    with open('/Users/harel/APP/replace_map.json', 'w', encoding='utf-8') as f:
        json.dump(replace_map, f, ensure_ascii=False, indent=2)
        
    print(f"Done! Successfully translated keys.")

if __name__ == "__main__":
    asyncio.run(main())
