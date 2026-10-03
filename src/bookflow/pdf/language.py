from collections import Counter

from .models import Page
from .text import script_of

# Scripts that are, for books, written in one language.
SCRIPT_LANGUAGES = {
    "GEORGIAN": "ka",
    "ARMENIAN": "hy",
    "GREEK": "el",
    "HEBREW": "he",
    "THAI": "th",
    "LAO": "lo",
    "KHMER": "km",
    "HANGUL": "ko",
    "HIRAGANA": "ja",
    "KATAKANA": "ja",
    "BENGALI": "bn",
    "GUJARATI": "gu",
    "GURMUKHI": "pa",
    "KANNADA": "kn",
    "MALAYALAM": "ml",
    "TAMIL": "ta",
    "TELUGU": "te",
    "SINHALA": "si",
    "ETHIOPIC": "am",
    "MYANMAR": "my",
    "TIBETAN": "bo",
}

# Short, frequent words that tell apart languages sharing a script.
COMMON_WORDS = {
    "en": {"the", "and", "of", "to", "in", "is", "was", "that", "he", "it", "with", "his"},
    "fr": {"le", "la", "les", "et", "des", "est", "une", "dans", "que", "il", "pas", "qui"},
    "de": {"der", "die", "und", "das", "ist", "nicht", "ein", "eine", "zu", "ich", "sie", "mit"},
    "es": {"el", "los", "las", "y", "que", "del", "una", "por", "con", "para", "se", "su"},
    "it": {"il", "di", "che", "e", "gli", "della", "un", "per", "non", "una", "sono", "si"},
    "pt": {"o", "os", "as", "de", "que", "do", "da", "em", "um", "uma", "não", "com"},
    "nl": {"de", "het", "een", "en", "van", "is", "dat", "niet", "zijn", "op", "ik", "met"},
    "ru": {"и", "в", "не", "на", "что", "он", "как", "с", "это", "она", "его", "был"},
    "uk": {"і", "в", "не", "на", "що", "він", "як", "з", "це", "вона", "його", "був"},
    "bg": {"и", "в", "не", "на", "че", "се", "да", "от", "това", "той", "тя", "са"},
    "sr": {"и", "у", "је", "да", "се", "на", "не", "од", "са", "што", "као", "био"},
    "ar": {"في", "من", "على", "إلى", "أن", "التي", "الذي", "عن", "مع", "هذا", "كان", "لا"},
    "fa": {"و", "در", "به", "از", "که", "این", "را", "با", "است", "برای", "آن", "می"},
    "ur": {"کے", "میں", "کی", "ہے", "اور", "سے", "کو", "پر", "کہ", "یہ", "ہیں", "نے"},
    "hi": {"के", "में", "की", "है", "और", "से", "को", "का", "पर", "यह", "था", "नहीं"},
    "mr": {"आणि", "आहे", "या", "हे", "ते", "की", "होते", "त्या", "मी", "तो", "नाही", "व"},
}

# Which of the word lists to try for each shared script.
SHARED_SCRIPTS = {
    "LATIN": ["en", "fr", "de", "es", "it", "pt", "nl"],
    "CYRILLIC": ["ru", "uk", "bg", "sr"],
    "ARABIC": ["ar", "fa", "ur"],
    "DEVANAGARI": ["hi", "mr"],
}

SAMPLE_LINES = 2000


def detect_language(pages: list[Page]) -> str | None:
    """Guess the book's language as a BCP 47 code, or None when unsure."""
    lines = [line.text for page in pages for line in page.lines][:SAMPLE_LINES]
    scripts = Counter(script_of(c) for text in lines for c in text)
    scripts.pop(None, None)
    if not scripts:
        return None

    script = scripts.most_common(1)[0][0]
    if script == "HAN":
        # Japanese mixes kanji with kana; Chinese has none.
        return "ja" if scripts["HIRAGANA"] + scripts["KATAKANA"] else "zh"
    if script in SCRIPT_LANGUAGES:
        return SCRIPT_LANGUAGES[script]
    if script in SHARED_SCRIPTS:
        return by_common_words(lines, SHARED_SCRIPTS[script])
    return None


def by_common_words(lines: list[str], languages: list[str]) -> str | None:
    words = Counter(
        word.strip(".,;:!?«»„“\"'()").lower() for text in lines for word in text.split()
    )
    scores = {}
    for lang in languages:
        # Words that several of the languages share ("de", "и") don't tell them apart.
        others = set().union(*(COMMON_WORDS[other] for other in languages if other != lang))
        scores[lang] = sum(words[w] for w in COMMON_WORDS[lang] - others)
    best = max(scores, key=lambda lang: scores[lang])
    return best if scores[best] > 0 else None
