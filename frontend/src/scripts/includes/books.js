import { Link } from 'react-router-dom';
import { BookIcon } from './icons';

// A library book's cover, or a plain stand-in when it has none.
export function BookCover({ book, className = '' }) {
    if (book.cover_url) return <img className={ `bf-cover ${className}` } src={ book.cover_url } alt="" />;
    return <div className={ `bf-cover bf-cover-none ${className}` }><BookIcon size={ 32 } /></div>;
}

export function DownloadButton({ t, book, className = '' }) {
    return (
        <a href={ book.epub_url } download className={ `btn btn-cobalt px-4 ${className}` }>
            { t.library.download }
        </a>
    );
}

// The books as a grid of covers, each opening the book's page.
export function BookGrid({ books }) {
    return (
        <ul className="bf-book-grid">
            { books.map((book, index) => (
                <li key={ book.id } style={ { '--i': index } }>
                    <Link to={ `/library/${book.id}` } className="bf-book-card" lang={ book.language || undefined }>
                        <BookCover book={ book } className="bf-cover-grid" />
                        <span className="bf-book-card-title">{ book.title }</span>
                        { book.author && <span className="small bf-muted">{ book.author }</span> }
                    </Link>
                </li>
            )) }
        </ul>
    );
}
