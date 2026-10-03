import hashlib
import sys
import uuid
from pathlib import Path

from bookflow.cli.commands import Args
from bookflow.epub import Metadata, write_epub
from bookflow.paragraphs import build_paragraphs
from bookflow.pdf import ReadError, read_pdf
from bookflow.structure import Section, build_sections


def run(args: Args) -> int:
    try:
        book = read_pdf(args.pdf, args.pages)
    except (ReadError, ValueError) as e:
        print(f"bookflow: {e}", file=sys.stderr)
        return 1

    pdf = Path(args.pdf)
    metadata = Metadata(
        title=args.title or book.title or pdf.stem,
        author=args.author or book.author,
        language=args.language or book.language or "und",
        identifier=book_identifier(pdf),
    )

    paragraphs = build_paragraphs(book.pages)
    sections = drop_repeated_title(build_sections(paragraphs, book.pages), metadata)

    output = Path(args.output) if args.output else pdf.with_suffix(".epub")
    try:
        write_epub(output, sections, metadata)
    except OSError as e:
        print(f"bookflow: can't write {output}: {e.strerror}", file=sys.stderr)
        return 1

    headings = sum(1 for section in sections if section.heading)
    print(f"Wrote {output}: {headings} headings, {len(paragraphs)} paragraphs")
    return 0


def drop_repeated_title(sections: list[Section], metadata: Metadata) -> list[Section]:
    """The title page already shows the title and author; don't print them again."""
    if not sections or sections[0].heading:
        return sections
    repeated = {metadata.title.casefold(), (metadata.author or "").casefold()}
    front = sections[0]
    front.paragraphs = [p for p in front.paragraphs if p.text.casefold() not in repeated]
    return sections if front.paragraphs else sections[1:]


def book_identifier(pdf: Path) -> str:
    """The same PDF always gets the same id, so readers see a new conversion as the same book."""
    digest = hashlib.sha256(pdf.read_bytes()).hexdigest()
    return f"urn:uuid:{uuid.uuid5(uuid.NAMESPACE_URL, digest)}"
