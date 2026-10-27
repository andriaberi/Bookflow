import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBooks } from '../helpers/api';
import { useSettings } from '../helpers/settings';
import { BookIcon } from '../includes/icons';

function Library() {
    const { t } = useSettings();
    const [books, setBooks] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        getBooks().then(setBooks).catch(() => setFailed(true));
    }, []);

    return (
        <section className="container bf-section bf-fill">
            <header className="bf-center-stacked bf-library-header">
                <h1 className="bf-display bf-page-title bf-optical-top mb-3">{ t.library.title }</h1>
                <p className="fs-5 bf-muted bf-page-lead mb-0">{ t.library.lead }</p>
            </header>

            { failed && <div className="bf-alert" role="alert">{ t.library.error }</div> }
            { books?.length === 0 && (
                <div className="bf-panel p-4 p-lg-5 text-center">
                    <p className="fs-5 mb-4">{ t.library.empty }</p>
                    <Link to="/suggest" className="btn btn-cobalt px-4">{ t.nav.suggest }</Link>
                </div>
            ) }
            { books?.length > 0 && (
                <ul className="bf-library">
                    { books.map((book) => <LibraryBook key={ book.slug } t={ t } book={ book } />) }
                </ul>
            ) }
        </section>
    );
}

function LibraryBook({ t, book }) {
    return (
        <li className="bf-library-book">
            { book.cover_url ? (
                <img className="bf-library-cover" src={ book.cover_url } alt="" />
            ) : (
                <div className="bf-library-cover bf-shelf-empty"><BookIcon size={ 32 } /></div>
            ) }
            <div className="bf-library-text" lang={ book.language || undefined }>
                <h2 className="fw-semibold fs-6 mb-1">{ book.title }</h2>
                { book.author && <div className="small bf-muted">{ book.author }</div> }
                { book.description && <p className="small bf-muted bf-library-description mt-2 mb-0">{ book.description }</p> }
            </div>
            { book.epub_url && (
                <a href={ book.epub_url } download className="btn btn-ghost btn-sm mt-auto">{ t.library.download }</a>
            ) }
        </li>
    );
}

export default Library;
