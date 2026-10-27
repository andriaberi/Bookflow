import json

from converter import engine
from django import forms
from django.core.files.base import ContentFile
from pdf2epub import ConvertError

from .models import Book

# Filled in from the book data when left blank.
FROM_DATA = ("title", "author", "language")


class BookForm(forms.ModelForm):
    data_file = forms.FileField(
        required=False,
        label="Book data",
        help_text="The book's pdf2epub data as a .json file. The EPUB is written from it.",
    )

    class Meta:
        model = Book
        exclude = ("data",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["title"].required = False
        self.fields["slug"].required = False
        self.data_to_save = self.instance.data
        self.written_epub = None

    def clean(self):
        cleaned = super().clean()
        upload = cleaned.get("data_file")
        if upload:
            try:
                self.data_to_save, inline_cover = engine.take_cover(json.load(upload))
            except (ValueError, ConvertError) as e:
                self.add_error("data_file", f"This isn't a book's data: {e}")
                return cleaned
            if inline_cover and not cleaned.get("cover"):
                cleaned["cover"] = ContentFile(inline_cover, name="cover.jpg")

        data = self.data_to_save
        if data:
            metadata = data["metadata"]
            for field in FROM_DATA:
                if not cleaned.get(field):
                    cleaned[field] = metadata.get(field) or ""
            if upload or "cover" in self.changed_data or not self.instance.epub:
                self.write_epub(data, cleaned.get("cover"))
        elif not cleaned.get("epub"):
            self.add_error("epub", "Upload an EPUB, or the book's data to write it from.")

        if not cleaned.get("title"):
            self.add_error("title", "This field is required.")
        return cleaned

    def write_epub(self, data, cover):
        # A cleared cover is False; a cover left as it was is the saved file.
        try:
            self.written_epub = engine.epub_bytes(engine.load_book(data, cover or None))
        except ConvertError as e:
            self.add_error("data_file" if self.cleaned_data.get("data_file") else None, f"The EPUB can't be written: {e}")

    def save(self, commit=True):
        book = super().save(commit=False)
        book.data = self.data_to_save
        if self.written_epub:
            book.set_epub(self.written_epub)
        if commit:
            book.save()
        return book
