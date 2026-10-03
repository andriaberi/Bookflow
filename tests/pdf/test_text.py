from bookflow.pdf.text import clean_text, script_of


def test_collapses_whitespace() -> None:
    assert clean_text("  one   two\tthree ") == "one two three"


def test_composes_to_nfc() -> None:
    assert clean_text("café") == "café"


def test_expands_ligatures() -> None:
    assert clean_text("ﬁnal") == "final"


def test_drops_invisible_characters() -> None:
    assert clean_text("a​b﻿c‍d") == "abcd"


def test_ocr_dash_runs_become_one_dash() -> None:
    assert clean_text("–- ვინ არის, –– მიუგო") == "— ვინ არის, — მიუგო"


def test_line_end_hyphen_is_normalised() -> None:
    assert clean_text("ატე–-") == "ატე-"
    assert clean_text("მოთხრო–") == "მოთხრო-"
    assert clean_text("hyphen­") == "hyphen-"


def test_dash_after_a_space_at_line_end_is_a_dash() -> None:
    assert clean_text("ვაებით. –-") == "ვაებით. —"


def test_keeps_inner_hyphens() -> None:
    assert clean_text("შარლ-ფრანსუა") == "შარლ-ფრანსუა"


def test_drops_middle_dots() -> None:
    assert clean_text("თავის ·ქცევით ·") == "თავის ქცევით"


def test_script_of() -> None:
    assert script_of("ა") == "GEORGIAN"
    assert script_of("a") == "LATIN"
    assert script_of("1") is None
