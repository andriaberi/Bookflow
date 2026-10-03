import re
import unicodedata

# Ligatures such as "ﬁ" and "ﬂ", which NFC keeps.
LIGATURES = re.compile(r"[\ufb00-\ufb06]")

# Invisible characters that only get in the way.
INVISIBLE = re.compile(r"[\u200b-\u200d\u2060\ufeff\u00ad\x00-\x08\x0b-\x1f\x7f]")

DASHES = "\\-\u2010\u2011\u2012\u2013\u2014\u2015\u2212"

# OCR often reads one dash as two or three ("–-", "-–-", "––").
DASH_RUN = re.compile(f"[{DASHES}]{{2,}}")

# A word broken at the end of the line, whatever dash the PDF used for it.
LINE_END_HYPHEN = re.compile(f"(?<=\\w)[{DASHES}]+$|(?<=\\w)\u00ad$")

# Neither English nor Georgian uses the middle dot; in OCR text it's dust.
STRAY_DOT = re.compile("·")

SPACES = re.compile(r"\s+")


def clean_text(text: str) -> str:
    """Normalise one line of PDF text so later steps can compare and join lines."""
    text = unicodedata.normalize("NFC", text)
    text = LIGATURES.sub(lambda m: unicodedata.normalize("NFKC", m.group()), text)
    text = SPACES.sub(" ", text).strip()

    text = LINE_END_HYPHEN.sub("-", text)
    text = INVISIBLE.sub("", text)
    text = DASH_RUN.sub("\u2014", text)
    text = STRAY_DOT.sub("", text)

    return SPACES.sub(" ", text).strip()


def script_of(char: str) -> str | None:
    """The Unicode script of a letter ("LATIN", "GEORGIAN", ...), None for anything else."""
    if not char.isalpha():
        return None
    return unicodedata.name(char, "").split(" ", 1)[0] or None
