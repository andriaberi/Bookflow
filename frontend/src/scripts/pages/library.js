import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBooks } from '../helpers/api';
import { fill } from '../helpers/format';
import { useSettings } from '../helpers/settings';
import { BookCover, BookGrid, DownloadButton } from '../includes/books';
import { Search } from '../includes/icons';

const SORTS = {
    newest: (a, b) => b.added.localeCompare(a.added),
    title: (a, b) => a.title.localeCompare(b.title),
    author: (a, b) => a.author.localeCompare(b.author) || a.title.localeCompare(b.title),
};

function Library() {
    const { t } = useSettings();
    const [books, setBooks] = useState(null);
    const [failed, setFailed] = useState(false);
    const [query, setQuery] = useState('');
    const [language, setLanguage] = useState('');
    const [sort, setSort] = useState('newest');

    useEffect(() => {
        getBooks().then(setBooks).catch(() => setFailed(true));
    }, []);

    const languages = useMemo(() => [...new Set((books || []).map((book) => book.language).filter(Boolean))], [books]);
    const newest = useMemo(() => (books || []).slice().sort(SORTS.newest)[0], [books]);

    const words = query.trim().toLowerCase();
    const shown = (books || [])
        .filter((book) => !language || book.language === language)
        .filter((book) => !words || `${book.title} ${book.author}`.toLowerCase().includes(words))
        .sort(SORTS[sort]);

    return (
        <section className="container bf-section bf-fill bf-library">
            <header className="bf-library-header">
                <div className="bf-center-stacked">
                    <h1 className="bf-display bf-page-title bf-optical-top mb-2">{ t.library.title }</h1>
                    <p className="fs-5 bf-muted bf-page-lead mb-0">{ t.library.lead }</p>
                </div>
                <label className="bf-search">
                    <Search size={ 18 } />
                    <input type="search" className="form-control" placeholder={ t.library.search } aria-label={ t.library.search } value={ query } onChange={ (e) => setQuery(e.target.value) } />
                </label>
            </header>

            { failed && <div className="bf-alert" role="alert">{ t.library.error }</div> }

            { books?.length === 0 && (
                <div className="bf-panel p-4 p-lg-5 text-center">
                    <p className="fs-5 mb-4">{ t.library.empty }</p>
                    <Link to="/suggest" className="btn btn-cobalt px-4">{ t.nav.suggest }</Link>
                </div>
            ) }

            { books?.length > 0 && (
                <>
                    { !words && <Featured t={ t } book={ newest } /> }

                    <div className="bf-library-toolbar">
                        { languages.length > 1 && (
                            <div className="bf-seg" role="group" aria-label={ t.library.language }>
                                { ['', ...languages].map((code) => (
                                    <button key={ code } type="button" className={ language === code ? 'on' : '' } aria-pressed={ language === code } onClick={ () => setLanguage(code) }>
                                        { code ? t.languages[code] || code : t.library.all }
                                    </button>
                                )) }
                            </div>
                        ) }
                        <span className="bf-muted small">{ shown.length === 1 ? t.library.countOne : fill(t.library.count, { n: shown.length }) }</span>
                        <select className="form-select form-select-sm bf-library-sort" aria-label={ t.library.sort } value={ sort } onChange={ (e) => setSort(e.target.value) }>
                            { Object.keys(SORTS).map((key) => <option key={ key } value={ key }>{ t.library.sorts[key] }</option>) }
                        </select>
                    </div>

                    { shown.length > 0 ? (
                        <BookGrid books={ shown } />
                    ) : (
                        <div className="text-center py-5">
                            <p className="fs-5 mb-3">{ fill(t.library.noResults, { query: query.trim() }) }</p>
                            <button type="button" className="btn btn-ghost px-4" onClick={ () => setQuery('') }>{ t.library.clearSearch }</button>
                        </div>
                    ) }
                </>
            ) }
        </section>
    );
}

// The newest book, large, with its description and download.
function Featured({ t, book }) {
    return (
        <article className="bf-featured" lang={ book.language || undefined }>
            <Link to={ `/library/${book.id}` } className="bf-featured-cover" tabIndex={ -1 } aria-hidden="true">
                <BookCover book={ book } />
            </Link>
            <div className="bf-featured-text">
                <div className="bf-eyebrow mb-2">{ t.library.featured }</div>
                <h2 className="bf-display bf-card-title mb-1">{ book.title }</h2>
                { book.author && <div className="fs-5 bf-muted mb-3">{ book.author }</div> }
                { book.description && <p className="bf-featured-description mb-4">{ book.description }</p> }
                <div className="bf-cta">
                    { book.epub_url && <DownloadButton t={ t } book={ book } className="px-4" /> }
                    <Link to={ `/library/${book.id}` } className="btn btn-ghost px-4">{ t.library.details }</Link>
                </div>
            </div>
        </article>
    );
}

export default Library;
