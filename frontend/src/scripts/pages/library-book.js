import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBooks, getLibraryBook } from '../helpers/api';
import { fill, megabytes } from '../helpers/format';
import { useSettings } from '../helpers/settings';
import { BookCover, BookGrid, DownloadButton } from '../includes/books';
import { ChevronRight } from '../includes/icons';
import Message from '../includes/message';
import { usePageTitle } from '../includes/page';

// How many other books to suggest under the book.
const MORE = 4;

function LibraryBook() {
    const { t } = useSettings();
    const { id } = useParams();
    const [book, setBook] = useState(null);
    const [missing, setMissing] = useState(false);
    const [more, setMore] = useState([]);
    usePageTitle(book?.title);

    useEffect(() => {
        let stale = false;
        setBook(null);
        setMissing(false);
        getLibraryBook(id)
            .then((data) => !stale && setBook(data))
            .catch(() => !stale && setMissing(true));
        getBooks()
            .then((books) => !stale && setMore(books.filter((other) => other.id !== id).slice(0, MORE)))
            .catch(() => {});
        return () => {
            stale = true;
        };
    }, [id]);

    if (missing) {
        return (
            <Message title={ t.library.notFound }>
                <p className="bf-muted fs-5 mb-4">{ t.library.notFoundLead }</p>
                <Link to="/library" className="btn btn-cobalt px-4">{ t.library.back }</Link>
            </Message>
        );
    }
    if (!book) return <section className="container bf-section bf-fill" aria-busy="true" />;

    const facts = [
        book.language && [t.library.language, t.languages[book.language] || book.language],
        book.chapters && [t.library.chapters, book.chapters],
        book.epub_size && [t.library.size, fill(t.library.mb, { mb: megabytes(book.epub_size) })],
    ].filter(Boolean);

    return (
        <section className="container bf-section bf-library-book">
            <Link to="/library" className="bf-back small">
                <ChevronRight size={ 16 } style={ { transform: 'rotate(180deg)' } } />
                { t.library.back }
            </Link>

            <div className="bf-book-page" lang={ book.language || undefined }>
                <BookCover book={ book } className="bf-cover-large" />
                <div className="bf-book-info">
                    <h1 className="bf-display bf-page-title mb-2">{ book.title }</h1>
                    { book.author && <div className="fs-4 bf-muted mb-4">{ book.author }</div> }
                    { book.epub_url && (
                        <div className="mb-4">
                            <DownloadButton t={ t } book={ book } className="btn-lg" />
                            <p className="small bf-muted mt-2 mb-0">{ t.library.readers }</p>
                        </div>
                    ) }
                    { facts.length > 0 && (
                        <dl className="bf-facts">
                            { facts.map(([label, value]) => (
                                <div key={ label }>
                                    <dt>{ label }</dt>
                                    <dd>{ value }</dd>
                                </div>
                            )) }
                        </dl>
                    ) }
                    { book.description && <p className="bf-book-description">{ book.description }</p> }
                </div>
            </div>

            { more.length > 0 && (
                <div className="bf-more">
                    <h2 className="bf-display bf-card-title mb-4">{ t.library.more }</h2>
                    <BookGrid books={ more } />
                </div>
            ) }
        </section>
    );
}

export default LibraryBook;
