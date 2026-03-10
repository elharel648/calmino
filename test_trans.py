from googletrans import Translator
try:
    translator = Translator()
    print(translator.translate('שלום', dest='en').text)
except Exception as e:
    print(e)
