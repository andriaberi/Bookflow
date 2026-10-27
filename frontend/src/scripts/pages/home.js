import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBooks } from '../helpers/api';
import { ENGINE_URL } from '../helpers/links';
import { useSettings } from '../helpers/settings';
import { ArrowRight, BookIcon, Plus } from '../includes/icons';

const SHELF_SIZE = 4;

function Home() {
    const { t } = useSettings();
    const [books, setBooks] = useState([]);

    useEffect(() => {
        getBooks().then(setBooks).catch(() => {});
    }, []);

    const shelf = books.filter((book) => book.cover_url).slice(0, SHELF_SIZE);
    const empty = SHELF_SIZE - shelf.length;

    return (
        <>
            <section className="bf-hero">
                <div className="container">
                    <div className="row g-5 align-items-center">
                        <div className="col-lg-6 bf-center-stacked">
                            <div className="bf-badge mb-4"><span className="bf-dot" />{ t.home.badge }</div>
                            <h1 className="bf-display bf-hero-title mb-4">
                                { t.home.heroA } <span className="bf-accent-text">{ t.home.heroB }</span>
                            </h1>
                            <p className="fs-5 mb-5 bf-muted bf-hero-text">{ t.home.heroText }</p>
                            <div className="bf-cta">
                                <Link to="/convert" className="btn btn-cobalt btn-lg px-4 py-3 d-inline-flex align-items-center gap-2">
                                    { t.home.convert } <ArrowRight />
                                </Link>
                                <Link to="/library" className="btn btn-ghost btn-lg px-4 py-3">{ t.home.browse }</Link>
                            </div>
                        </div>
                        <div className="col-lg-6">
                            <HeroArt t={ t } />
                        </div>
                    </div>
                </div>
            </section>

            <section className="container bf-section">
                <div className="bf-center-stacked">
                    <div className="bf-eyebrow mb-2">{ t.home.howEyebrow }</div>
                    <h2 className="bf-display bf-section-title mb-5">{ t.home.howTitle }</h2>
                </div>
                <div className="row g-4">
                    { t.home.steps.map((step, index) => (
                        <div className="col-lg-4" key={ step.title }>
                            <div className={ `bf-step ${index === 2 ? 'bf-step-accent' : ''}` }>
                                <div className="bf-display bf-step-number">{ String(index + 1).padStart(2, '0') }</div>
                                <div>
                                    <h3 className="h5 fw-semibold mb-2">{ step.title }</h3>
                                    <p className="mb-0">{ step.text }</p>
                                </div>
                            </div>
                        </div>
                    )) }
                </div>
            </section>

            <section className="container bf-section">
                <div className="bf-panel p-4 p-lg-5">
                    <div className="row g-5 align-items-center">
                        <div className="col-lg-5 bf-center-stacked">
                            <h2 className="bf-display bf-section-title mb-3">{ t.home.fixTitle }</h2>
                            <p className="bf-muted mb-4">{ t.home.fixText }</p>
                            <div className="bf-chips d-flex flex-wrap gap-2">
                                { t.home.fixes.map((fix) => <span className="bf-chip" key={ fix }>{ fix }</span>) }
                            </div>
                        </div>
                        <div className="col-lg-7">
                            <FixExample t={ t } />
                        </div>
                    </div>
                </div>
            </section>

            <section className="container bf-section">
                <div className="row g-4">
                    <div className="col-lg-7">
                        <div className="bf-panel h-100 p-4 p-lg-5 d-flex flex-column bf-center-stacked">
                            <div className="bf-eyebrow mb-2">{ t.nav.library }</div>
                            <h2 className="bf-display bf-card-title mb-3">{ t.home.libraryTitle }</h2>
                            <p className="bf-muted mb-4">{ t.home.libraryText }</p>
                            <div className="bf-shelf mb-4" aria-hidden="true">
                                { shelf.map((book) => <img key={ book.id } src={ book.cover_url } alt="" className="bf-shelf-book" />) }
                                { Array.from({ length: empty }, (_, i) => (
                                    <div key={ i } className="bf-shelf-book bf-shelf-empty"><BookIcon size={ 28 } /></div>
                                )) }
                            </div>
                            <div className="mt-auto"><Link to="/library" className="btn btn-ghost px-4 py-2">{ t.home.browse }</Link></div>
                        </div>
                    </div>
                    <div className="col-lg-5">
                        <div className="bf-panel-soft h-100 p-4 p-lg-5 d-flex flex-column bf-center-stacked">
                            <span className="bf-icon-tile mb-4"><Plus size={ 24 } /></span>
                            <h2 className="bf-display bf-card-title mb-3">{ t.home.suggestTitle }</h2>
                            <p className="mb-4">{ t.home.suggestText }</p>
                            <div className="mt-auto"><Link to="/suggest" className="btn btn-cobalt px-4 py-2">{ t.nav.suggest }</Link></div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="container bf-section pb-5">
                <div className="bf-support p-4 p-lg-5">
                    <div className="bf-support-inner">
                        <div className="bf-support-text">
                            <h2 className="bf-display bf-card-title mb-2">{ t.home.supportTitle }</h2>
                            <p className="fs-5 mb-0">{ t.home.supportText }</p>
                        </div>
                        <div className="bf-support-actions">
                            <Link to="/support" className="btn btn-lg btn-white px-4 py-3">{ t.home.supportButton }</Link>
                            <a href={ ENGINE_URL } className="btn btn-lg btn-white-outline px-4 py-3">{ t.home.star }</a>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

// A fixed PDF page, an arrow, and the same text reflowed on an e-reader.
function HeroArt({ t }) {
    const sample = t.home.sample;
    const lines = [100, 100, 90, 100, 55, 'indent', 100, 85, 100, 40, 'indent', 70];
    return (
        <div className="bf-hero-art" aria-hidden="true">
            <div className="bf-pdf-page">
                <div className="bf-pdf-top">
                    <span className="bf-pdf-tag">PDF</span>
                    <span className="bf-pdf-note">{ t.home.fixedLayout }</span>
                </div>
                <div className="bf-pdf-heading" />
                <div className="bf-pdf-lines">
                    { lines.map((width, i) => (
                        <div
                            key={ i }
                            className={ `bf-pdf-line ${width === 'indent' ? 'bf-pdf-indent' : ''}` }
                            style={ width === 'indent' ? undefined : { width: `${width}%` } }
                        />
                    )) }
                </div>
                <div className="bf-pdf-note bf-pdf-number">2</div>
            </div>

            <div className="bf-hero-arrow"><ArrowRight size={ 22 } /></div>

            <div className="bf-reader">
                <div className="bf-reader-screen" lang={ sample.lang }>
                    <div className="bf-reader-bar"><span>{ sample.book }</span><span>Aa</span></div>
                    <div className="bf-reader-heading">{ sample.heading }</div>
                    { sample.paragraphs.map((text) => <p key={ text }>{ text }</p>) }
                    <div className="bf-reader-progress"><div><div /></div><span>3%</span></div>
                </div>
            </div>
        </div>
    );
}

// A mistake like the ones PDFs really have, and how the editor fixes it.
function FixExample({ t }) {
    const sample = t.home.sample;
    return (
        <div className="bf-well p-3 d-flex flex-column gap-2" aria-hidden="true">
            <div className="bf-block d-flex flex-wrap align-items-center gap-2">
                <span className="bf-level">H1</span>
                <span className="fw-semibold" lang={ sample.lang }>{ sample.heading }</span>
                <span className="small ms-auto bf-muted">{ t.home.page } 2</span>
            </div>
            <div className="bf-block bf-block-selected">
                <p className="mb-3" lang={ sample.lang } style={ { lineHeight: 1.7 } }>
                    { sample.before } <span className="bf-mark-wrong">{ sample.wrong }</span>{ ' ' }
                    <span className="bf-mark-right">{ sample.right }</span> { sample.after }
                </p>
                <div className="d-flex flex-wrap gap-2">
                    <span className="bf-outline-chip">{ t.home.splitHere }</span>
                    <span className="bf-outline-chip">{ t.home.joinNext }</span>
                    <span className="bf-outline-chip">{ t.home.makeHeading }</span>
                </div>
            </div>
            <div className="bf-block bf-block-out d-flex align-items-center gap-3">
                <span className="bf-switch-off"><span /></span>
                <span className="small bf-muted">
                    { t.home.titlePage } · <span className="text-decoration-line-through" lang={ sample.lang }>{ sample.titlePage }</span>
                </span>
            </div>
        </div>
    );
}

export default Home;
