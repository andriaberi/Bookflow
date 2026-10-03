import sys

from bookflow.cli.commands import Args
from bookflow.pdf import ReadError, read_pdf


def run(args: Args) -> int:
    try:
        book = read_pdf(args.pdf, args.pages)
    except (ReadError, ValueError) as e:
        print(f"bookflow: {e}", file=sys.stderr)
        return 1

    title = args.title or book.title
    author = args.author or book.author
    language = args.language or book.language or "und"

    print(f"title: {title}")
    print(f"author: {author}")
    print(f"language: {language}")
    for page in book.pages:
        print(f"\n--- page {page.number} ---")
        for line in page.lines:
            print(line.text)

    # TODO: build paragraphs -> write EPUB

    return 0
