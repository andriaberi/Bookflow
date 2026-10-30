"""Visitors' PDFs and images are opened in a process of their own, with limits on its
memory and time, so a file built to do harm (one that unpacks into gigabytes, never
finishes, or crashes MuPDF) fails on its own instead of taking a worker, and every
request on it, down with it.

Nothing here uses Django: engine.py passes the limits in from settings.
"""

import math
import multiprocessing
import resource
import signal
import time
from dataclasses import dataclass

import pdf2epub
import pymupdf
from pdf2epub import ConvertError, Options
from pdf2epub.cover import load_cover


class LimitError(ConvertError):
    """The file needed more memory or time than it may have."""


TOO_MUCH = "The file needs more memory or time than the converter allows"


@dataclass(frozen=True)
class Limits:
    # Beyond what the process starts with
    memory_mb: int
    # Of processor time, and of waiting for the answer
    seconds: float


# Processes are forked from a server started once, with PyMuPDF and PDF2EPUB already
# imported, so each starts in milliseconds and none inherits the worker's threads.
_context = multiprocessing.get_context("forkserver")
_context.set_forkserver_preload([__name__])


def _address_space() -> int:
    """How much address space this process has taken, in bytes. Most of what a fresh
    process has is reserved, not used, so the limit is counted on top of it."""
    with open("/proc/self/status") as status:
        for line in status:
            if line.startswith("VmSize:"):
                return int(line.split()[1]) * 1024
    return 0


def _child(conn, task, args, limits: Limits) -> None:
    memory = _address_space() + limits.memory_mb * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_AS, (memory, memory))
    cpu = math.ceil(limits.seconds)
    resource.setrlimit(resource.RLIMIT_CPU, (cpu, cpu + 1))
    try:
        result = task(conn, *args)
    except ConvertError as e:
        conn.send(("failed", str(e)))
    except MemoryError:
        conn.send(("limit", None))
    except Exception as e:  # MuPDF reports running out of memory as its own error
        out_of_memory = any(word in str(e).lower() for word in ("memory", "alloc"))
        conn.send(("limit" if out_of_memory else "crashed", f"{type(e).__name__}: {e}"))
    else:
        conn.send(("done", result))


def _run(task, args, limits: Limits, on_step=None):
    """What `task` returns, run in a new process within `limits`; ConvertError with the
    task's reason if it fails, LimitError if it goes over, RuntimeError if it crashes."""
    receive, send = _context.Pipe(duplex=False)
    process = _context.Process(target=_child, args=(send, task, args, limits), daemon=True)
    process.start()
    send.close()
    deadline = time.monotonic() + limits.seconds
    try:
        while receive.poll(max(0, deadline - time.monotonic())):
            try:
                kind, value = receive.recv()
            except EOFError:  # gone without a word
                break
            if kind == "step":
                if on_step:
                    on_step(value)
            elif kind == "done":
                return value
            elif kind == "failed":
                raise ConvertError(value)
            elif kind == "limit":
                raise LimitError(TOO_MUCH)
            else:
                raise RuntimeError(value)
        else:
            raise LimitError(TOO_MUCH)
    finally:
        if process.is_alive():
            process.kill()
        process.join()
        receive.close()
    # Killed for taking too much processor time (SIGXCPU) or memory (the kernel's SIGKILL)
    if process.exitcode in (-signal.SIGXCPU, -signal.SIGKILL):
        raise LimitError(TOO_MUCH)
    raise RuntimeError(f"the process ended with code {process.exitcode}")


# The tasks, run in the new process; each is passed the pipe to report steps on.

def _read_book(conn, path: str) -> tuple[dict, bytes | None]:
    # Pictures are left out for now: the editor would load every one with the book.
    book = pdf2epub.read_book(Options(pdf=path, pictures=False), lambda step: conn.send(("step", step)))
    data = book.to_dict()
    data["cover"] = None  # sent apart, as the image itself
    return data, book.cover.data if book.cover else None


def _count_pages(conn, data: bytes) -> int:
    try:
        with pymupdf.open(stream=data, filetype="pdf") as doc:
            return doc.page_count
    except (pymupdf.FileDataError, RuntimeError) as e:
        raise ConvertError(str(e)) from None


def _render_page(conn, path: str, number: int, width: int, max_pixels: int) -> bytes:
    # A page far taller than it is wide would come out enormous, so it is drawn narrower.
    with pymupdf.open(path) as doc:
        if 1 <= number <= doc.page_count:
            rect = doc[number - 1].rect
            if rect.width > 0 and rect.height > 0:
                width = min(width, max(1, int(math.sqrt(max_pixels * rect.width / rect.height))))
    return pdf2epub.render_page(path, number, width)


def _cover(conn, image: bytes) -> bytes:
    return load_cover(image).data


# What engine.py calls.

def read_book(path: str, limits: Limits, on_step=None) -> tuple[dict, bytes | None]:
    """The book in the PDF as data, without its cover, and the cover as JPEG if it has one."""
    return _run(_read_book, (path,), limits, on_step)


def count_pages(data: bytes, limits: Limits) -> int:
    """The PDF's page count; ConvertError if it can't be opened."""
    return _run(_count_pages, (data,), limits)


def render_page(path: str, number: int, width: int, max_pixels: int, limits: Limits) -> bytes:
    """Page `number` of the PDF, from 1, as a PNG `width` wide, or narrower if it would
    be over `max_pixels`."""
    return _run(_render_page, (path, number, width, max_pixels), limits)


def cover(image: bytes, limits: Limits) -> bytes:
    """The image as a cover, in JPEG; ConvertError (CoverError) if it isn't one."""
    return _run(_cover, (image,), limits)
