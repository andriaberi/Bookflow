import zipfile
from collections.abc import Callable
from pathlib import Path

import pytest

from bookflow.cli.commands import Args
from bookflow.pipeline import run


def test_writes_an_epub(
    make_pdf: Callable[..., str], tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    output = tmp_path / "out.epub"
    assert run(Args(pdf=make_pdf([["Hello world."]]), output=str(output))) == 0
    assert "Wrote" in capsys.readouterr().out
    assert zipfile.ZipFile(output).read("mimetype") == b"application/epub+zip"


def test_writes_next_to_the_pdf_by_default(make_pdf: Callable[..., str]) -> None:
    pdf = Path(make_pdf([["Hello world."]]))
    assert run(Args(pdf=str(pdf))) == 0
    assert pdf.with_suffix(".epub").is_file()


def test_reports_read_errors(capsys: pytest.CaptureFixture[str]) -> None:
    assert run(Args(pdf="missing.pdf")) == 1
    assert "no such file" in capsys.readouterr().err
