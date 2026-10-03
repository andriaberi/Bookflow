import pytest

from bookflow.pdf.language import detect_language
from bookflow.pdf.models import Line, Page


def book(*texts: str) -> list[Page]:
    return [Page(1, 400, 600, [Line(text, 0, 0, 0, 0) for text in texts])]


@pytest.mark.parametrize(
    ("text", "language"),
    [
        ("1815 წელს შარლ-ფრანსუა-ბიენვენიუ მირიელი ქალაქ დინის", "ka"),
        ("Ἐν ἀρχῇ ἦν ὁ λόγος", "el"),
        ("It was the best of times, it was the worst of times", "en"),
        ("Il était une fois dans un pays lointain, et le roi", "fr"),
        ("Es war einmal ein König, der hatte eine Tochter und", "de"),
        ("Он сказал, что это была она", "ru"),
        ("Він сказав, що це була вона", "uk"),
        ("吾輩は猫である。名前はまだ無い。", "ja"),
        ("道可道，非常道。名可名，非常名。", "zh"),
    ],
)
def test_detects_language(text: str, language: str) -> None:
    assert detect_language(book(text)) == language


def test_unknown_without_letters() -> None:
    assert detect_language(book("1 2 3")) is None
