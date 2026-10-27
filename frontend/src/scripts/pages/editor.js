import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { errorCode, getBook, getEpub, getPreviewPage, getPreviewUrl, pageUrl, removeCover, saveBook, uploadCover } from '../helpers/api';
import {
    headingText, joinBlocks, levelAt, newHeading, pageRange, roleCounts, sectionOf, sectionsOf,
    splitBlock, toHeading, toText, withBlock, withBlocks,
} from '../helpers/book';
import { fill } from '../helpers/format';
import { useConversionOpen } from '../helpers/presence';
import { useSettings } from '../helpers/settings';
import { ChevronRight, Close } from '../includes/icons';
import Message from '../includes/message';

// How long to wait after the last change before saving, and before trying a failed save again.
const SAVE_DELAY_MS = 600;
const RETRY_MS = 3000;

const LANGUAGES = ['ka', 'en'];

// Heading levels: 1 is the outermost division, 6 a subheading set in the text.
const LEVELS = [1, 2, 3, 4, 5, 6];

function Editor() {
    const { t } = useSettings();
    const { id } = useParams();
    const [loaded, setLoaded] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [book, setBook] = useState(null);
    const [coverUrl, setCoverUrl] = useState(null);
    const [problems, setProblems] = useState([]);
    const [saveState, setSaveState] = useState('saved');
    const [section, setSection] = useState(0);
    const [selected, setSelected] = useState(null);
    const [page, setPage] = useState(1);
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState('');
    // Goes up each time a save finishes, so the EPUB preview shows the latest edits.
    const [savedVersion, setSavedVersion] = useState(0);
    useConversionOpen(id);

    useEffect(() => {
        let stale = false;
        getBook(id)
            .then((data) => {
                if (stale) return;
                setLoaded(data);
                setBook(data.book);
                setCoverUrl(data.cover_url);
                // Open on the first section with something in the EPUB, not on a title
                // page that's left out.
                const start = sectionsOf(data.book.blocks).findIndex((range) => data.book.blocks.slice(range.start, range.end).some((block) => block.include));
                setSection(Math.max(start, 0));
                const first = data.book.blocks.find((block) => block.include && block.page > 0);
                setPage(first ? first.page : 1);
            })
            .catch((e) => !stale && setLoadError({ not_ready: 'notReady', not_found: 'gone' }[e.code] || 'server'));
        // A load that's been replaced (another book, or React mounting twice in
        // development) is ignored, so the book isn't set twice and saved for nothing.
        return () => {
            stale = true;
        };
    }, [id]);

    // Saving: each change waits a moment so typing doesn't save on every key, and a save
    // that fails is tried again. `saved` holds the last book the server has.
    const saved = useRef(null);
    const bookRef = useRef(null);
    const timer = useRef(null);
    const pending = useRef(Promise.resolve());

    const save = useCallback(() => {
        clearTimeout(timer.current);
        const current = bookRef.current;
        if (!current || current === saved.current) {
            setSaveState('saved');
            return pending.current;
        }
        setSaveState('saving');
        pending.current = saveBook(id, current)
            .then((result) => {
                saved.current = current;
                setProblems(result.problems);
                setSavedVersion((version) => version + 1);
                setSaveState(bookRef.current === current ? 'saved' : 'saving');
            })
            .catch(() => {
                setSaveState('error');
                timer.current = setTimeout(save, RETRY_MS);
            });
        return pending.current;
    }, [id]);

    useEffect(() => {
        bookRef.current = book;
        if (!book) return;
        if (saved.current === null) saved.current = book; // the book as loaded is already saved
        if (book === saved.current) return;
        setSaveState('saving');
        clearTimeout(timer.current);
        timer.current = setTimeout(save, SAVE_DELAY_MS);
    }, [book, save]);

    useEffect(() => () => clearTimeout(timer.current), []);

    const sections = useMemo(() => (book ? sectionsOf(book.blocks) : []), [book]);

    if (loadError) {
        return (
            <Message title={ loadError === 'server' ? t.editor.errors.server : t.editor[loadError] }>
                { loadError === 'gone' ? (
                    <>
                        <p className="bf-muted fs-5 mb-4">{ t.reading.notFoundLead }</p>
                        <Link to="/convert" className="btn btn-cobalt px-4">{ t.reading.tryAgain }</Link>
                    </>
                ) : (
                    <Link to={ `/convert/${id}` } className="btn btn-cobalt px-4">{ t.editor.back }</Link>
                ) }
            </Message>
        );
    }

    if (!book) {
        return (
            <section className="container bf-section bf-fill text-center bf-message" aria-busy="true">
                <span className="spinner-border bf-editor-spinner mb-3" aria-hidden="true" />
                <p className="bf-muted fs-5">{ t.editor.loading }</p>
            </section>
        );
    }

    const shown = Math.min(section, sections.length - 1);
    const range = sections[shown] || { start: 0, end: 0 };

    function showSection(index) {
        setSection(index);
        setSelected(null);
        const pages = pageRange(book.blocks.slice(sections[index].start, sections[index].end));
        if (pages) setPage(pages.from);
        document.querySelector('.bf-editor')?.scrollIntoView?.({ block: 'start' });
    }

    function select(index) {
        setSelected(index);
        if (book.blocks[index].page > 0) setPage(book.blocks[index].page);
    }

    // A change that adds, removes or retypes blocks moves the sections, so keep showing
    // the section the edited block is in, and keep it selected.
    function restructure(next, focus) {
        setBook(next);
        setSection(sectionOf(sectionsOf(next.blocks), focus));
        setSelected(focus);
    }

    const edit = {
        change: (index, changes) => setBook((old) => withBlock(old, index, changes)),
        include: (indexes, include) => setBook((old) => {
            const wanted = new Set(indexes);
            return { ...old, blocks: old.blocks.map((block, at) => (wanted.has(at) && block.include !== include ? { ...block, include } : block)) };
        }),
        setType: (index, value) => {
            const block = book.blocks[index];
            let next;
            if (value === 'text') next = block.type === 'text' ? block : toText(block);
            else next = block.type === 'heading' ? { ...block, level: Number(value) } : toHeading(block, Number(value));
            restructure(withBlocks(book, index, index + 1, [next]), index);
        },
        headingAbove: (index) => {
            const heading = newHeading(book.blocks[index].page, levelAt(book.blocks, index));
            restructure(withBlocks(book, index, index, [heading]), index);
        },
        split: (index, at) => {
            const parts = splitBlock(book.blocks[index], at);
            if (parts) restructure(withBlocks(book, index, index + 1, parts), index + 1);
        },
        join: (index) => {
            const next = book.blocks[index + 1];
            if (next?.type !== 'text') return;
            restructure(withBlocks(book, index, index + 2, [joinBlocks(book.blocks[index], next)]), index);
        },
    };

    async function download() {
        setDownloadError('');
        setDownloading(true);
        try {
            await save();
            await pending.current;
            const { blob, filename } = await getEpub(id);
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (e) {
            setDownloadError(errorCode(e, t.editor.errors));
        } finally {
            setDownloading(false);
        }
    }

    return (
        <section className="bf-editor container-xxl">
            <div className="bf-editor-bar">
                <div className="bf-editor-file">
                    <span className="fw-semibold bf-reading-name">{ loaded.name }.pdf</span>
                    <span className="bf-muted">{ fill(t.editor.pages, { n: loaded.pages }) }</span>
                    <span className={ `bf-save bf-save-${saveState}` } role="status">
                        <span className="bf-save-dot" aria-hidden="true" />
                        { saveState === 'saved' ? t.editor.saved : saveState === 'saving' ? t.editor.saving : t.editor.unsaved }
                    </span>
                    <span className="small bf-muted">{ t.editor.leaveNote }</span>
                </div>
                <div className="bf-editor-actions">
                    <Link to="/convert" className="btn btn-ghost bf-another">{ t.editor.another }</Link>
                    <button type="button" className="btn btn-cobalt bf-download" onClick={ download } disabled={ downloading || problems.length > 0 }>
                        { downloading ? t.editor.downloading : t.editor.download }
                    </button>
                </div>
            </div>

            { problems.length > 0 && (
                <div className="bf-alert mb-3" role="alert">
                    <div className="mb-1">{ t.editor.problemsTitle }</div>
                    <ul className="mb-0">{ problems.map((problem) => <li key={ problem }>{ problem }</li>) }</ul>
                </div>
            ) }
            { downloadError && (
                <div className="bf-alert mb-3" role="alert">
                    <span>{ t.editor.errors[downloadError] }</span>
                    <button type="button" className="bf-alert-close" aria-label="×" onClick={ () => setDownloadError('') }><Close size={ 16 } /></button>
                </div>
            ) }

            <div className="bf-editor-grid">
                <aside className="bf-editor-side">
                    <BookDetails t={ t } id={ id } book={ book } coverUrl={ coverUrl } setCoverUrl={ setCoverUrl } setBook={ setBook } />
                    <Included t={ t } book={ book } setBook={ setBook } />
                    <Contents t={ t } book={ book } sections={ sections } current={ shown } onPick={ showSection } />
                </aside>

                <div className="bf-editor-main">
                    <SectionView
                        key={ shown }
                        t={ t }
                        book={ book }
                        sections={ sections }
                        index={ shown }
                        range={ range }
                        selected={ selected }
                        onSelect={ select }
                        onPick={ showSection }
                        edit={ edit }
                    />
                </div>

                <aside className="bf-editor-preview">
                    <Preview
                        t={ t }
                        id={ id }
                        page={ page }
                        pages={ loaded.pages }
                        setPage={ setPage }
                        blockId={ (selected !== null && book.blocks[selected]?.id) || book.blocks[range.start]?.id }
                        version={ savedVersion }
                        blocked={ problems.length > 0 }
                    />
                </aside>
            </div>
        </section>
    );
}

// Title, author, language and cover.
function BookDetails({ t, id, book, coverUrl, setCoverUrl, setBook }) {
    const metadata = book.metadata;
    const set = (field, value) => setBook((old) => ({ ...old, metadata: { ...old.metadata, [field]: value } }));
    const languages = LANGUAGES.includes(metadata.language) ? LANGUAGES : [...LANGUAGES, metadata.language];
    const [coverBusy, setCoverBusy] = useState(false);
    const [coverError, setCoverError] = useState('');

    async function changeCover(action) {
        setCoverError('');
        setCoverBusy(true);
        try {
            setCoverUrl((await action()).cover_url);
        } catch (e) {
            setCoverError(errorCode(e, t.editor.coverErrors));
        } finally {
            setCoverBusy(false);
        }
    }

    return (
        <section className="bf-editor-card">
            <h2 className="bf-editor-card-title">{ t.editor.book }</h2>
            <div className={ `bf-editor-cover ${coverUrl ? '' : 'bf-editor-cover-empty'}` }>
                { coverUrl ? <img src={ coverUrl } alt={ t.editor.coverAlt } /> : <span className="bf-muted small">{ t.editor.noCover }</span> }
            </div>
            <div className="bf-cover-actions">
                <label className={ `btn btn-ghost btn-sm ${coverBusy ? 'disabled' : ''}` }>
                    { t.editor.replaceCover }
                    <input
                        type="file"
                        accept="image/*"
                        className="visually-hidden"
                        disabled={ coverBusy }
                        onChange={ (e) => {
                            const file = e.target.files[0];
                            e.target.value = '';
                            if (file) changeCover(() => uploadCover(id, file));
                        } }
                    />
                </label>
                { coverUrl && (
                    <button type="button" className="btn btn-ghost btn-sm" disabled={ coverBusy } onClick={ () => changeCover(() => removeCover(id)) }>
                        { t.editor.removeCover }
                    </button>
                ) }
            </div>
            { coverError && <div className="bf-alert bf-alert-sm mb-2" role="alert">{ t.editor.coverErrors[coverError] }</div> }

            <label className="form-label small fw-medium mb-1" htmlFor="bf-title">{ t.editor.title }</label>
            <input id="bf-title" className="form-control form-control-sm mb-2" value={ metadata.title } onChange={ (e) => set('title', e.target.value) } />
            <label className="form-label small fw-medium mb-1" htmlFor="bf-author">{ t.editor.author }</label>
            <input
                id="bf-author"
                className="form-control form-control-sm mb-2"
                value={ metadata.author || '' }
                placeholder={ t.editor.authorPlaceholder }
                onChange={ (e) => set('author', e.target.value || null) }
            />
            <label className="form-label small fw-medium mb-1" htmlFor="bf-language">{ t.editor.language }</label>
            <select id="bf-language" className="form-select form-select-sm" value={ metadata.language } onChange={ (e) => set('language', e.target.value) }>
                { languages.map((code) => (
                    <option key={ code } value={ code }>{ t.languages[code] ? `${t.languages[code]} (${code})` : code }</option>
                )) }
            </select>
        </section>
    );
}

// Which parts besides the body text go into the EPUB, and the notes.
function Included({ t, book, setBook }) {
    const roles = roleCounts(book.blocks);
    const setRole = (role, include) => setBook((old) => ({
        ...old,
        blocks: old.blocks.map((block) => (block.role === role ? { ...block, include } : block)),
    }));
    const notes = book.notes.length;

    return (
        <section className="bf-editor-card">
            <h2 className="bf-editor-card-title">{ t.editor.inEpub }</h2>
            { Object.entries(roles).map(([role, { count, included }]) => (
                <div className="form-check form-switch bf-switch-row" key={ role }>
                    <input className="form-check-input" type="checkbox" role="switch" id={ `bf-role-${role}` } checked={ included } onChange={ (e) => setRole(role, e.target.checked) } />
                    <label className="form-check-label" htmlFor={ `bf-role-${role}` }>{ t.editor.roles[role] || role }</label>
                    <span className="bf-muted">{ count }</span>
                </div>
            )) }
            <div className="form-check form-switch bf-switch-row">
                <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="bf-notes"
                    checked={ notes > 0 && book.include_notes }
                    disabled={ notes === 0 }
                    onChange={ (e) => setBook((old) => ({ ...old, include_notes: e.target.checked })) }
                />
                <label className="form-check-label" htmlFor="bf-notes">{ t.editor.notes }</label>
                <span className="bf-muted">{ notes || t.editor.none }</span>
            </div>
        </section>
    );
}

// A section is named after its heading; the blocks before the first heading have none.
function sectionName(t, first) {
    return first?.type === 'heading' ? headingText(first) || t.editor.untitled : t.editor.beforeFirst;
}

// The headings, indented by level; picking one shows its section.
function Contents({ t, book, sections, current, onPick }) {
    const chapters = sections.filter((section) => book.blocks[section.start].type === 'heading').length;
    return (
        <section className="bf-editor-card bf-editor-contents d-none d-lg-flex">
            <div className="d-flex justify-content-between align-items-baseline">
                <h2 className="bf-editor-card-title">{ t.editor.contents }</h2>
                <span className="small bf-muted">{ fill(t.editor.chapterCount, { n: chapters }) }</span>
            </div>
            <ol className="bf-toc">
                { sections.map((section, index) => {
                    const block = book.blocks[section.start];
                    const isHeading = block.type === 'heading';
                    return (
                        <li key={ block.id }>
                            <button
                                type="button"
                                className={ `bf-toc-item ${index === current ? 'on' : ''} ${isHeading && !block.include ? 'out' : ''}` }
                                style={ { paddingLeft: `${0.6 + (isHeading ? block.level - 1 : 0) * 0.9}rem` } }
                                aria-current={ index === current ? 'true' : undefined }
                                onClick={ () => onPick(index) }
                            >
                                <span className="bf-toc-text">{ sectionName(t, block) }</span>
                                { block.page > 0 && <span className="bf-toc-page">{ block.page }</span> }
                            </button>
                        </li>
                    );
                }) }
            </ol>
        </section>
    );
}

// One section: its heading and paragraphs, the tools to include or leave out many at
// once, and the editing of the selected block.
function SectionView({ t, book, sections, index, range, selected, onSelect, onPick, edit }) {
    const blocks = book.blocks.slice(range.start, range.end);
    const first = blocks[0];
    const pages = pageRange(blocks);
    const all = blocks.map((_, offset) => range.start + offset);

    // Select mode: tick paragraphs (Shift-click ticks a range), then include or leave out.
    const [picking, setPicking] = useState(false);
    const [picked, setPicked] = useState(() => new Set());
    const anchor = useRef(null);

    function pick(at, shift) {
        setPicked((old) => {
            const next = new Set(old);
            if (shift && anchor.current !== null) {
                const [from, to] = [Math.min(anchor.current, at), Math.max(anchor.current, at)];
                for (let i = from; i <= to; i += 1) next.add(i);
            } else if (next.has(at)) {
                next.delete(at);
            } else {
                next.add(at);
            }
            return next;
        });
        anchor.current = at;
    }

    function stopPicking() {
        setPicking(false);
        setPicked(new Set());
        anchor.current = null;
    }

    return (
        <>
            <div className="bf-section-head">
                <div className="small bf-muted">
                    { fill(t.editor.chapterOf, { n: index + 1, total: sections.length }) }
                    { pages && ` · ${fill(t.editor.pageRange, pages)}` }
                </div>
                <h1 className="bf-display bf-section-name">
                    { sectionName(t, first) }
                </h1>
                {/* Tablets and phones: the contents as a picker, instead of the long list. */}
                <select
                    className="form-select bf-section-picker d-lg-none"
                    aria-label={ t.editor.contents }
                    value={ index }
                    onChange={ (e) => onPick(Number(e.target.value)) }
                >
                    { sections.map((section, at) => {
                        const block = book.blocks[section.start];
                        return <option key={ block.id } value={ at }>{ sectionName(t, block) }</option>;
                    }) }
                </select>
            </div>

            <div className={ `bf-bulk ${picking ? 'picking' : ''}` }>
                { picking ? (
                    <>
                        {/* On phones this is a bar at the bottom of the screen: the count with
                            Select all and Done on top, the two actions full width below. */}
                        <div className="bf-bulk-top">
                            <span className="fw-semibold">{ fill(t.editor.selectedCount, { n: picked.size }) }</span>
                            <div className="bf-bulk-links">
                                <button type="button" className="btn btn-sm btn-ghost" onClick={ () => setPicked(new Set(all)) }>{ t.editor.selectAll }</button>
                                <button type="button" className="btn btn-sm btn-ghost" onClick={ stopPicking }>{ t.editor.done }</button>
                            </div>
                        </div>
                        <div className="bf-bulk-main">
                            <button type="button" className="btn btn-sm btn-cobalt" disabled={ picked.size === 0 } onClick={ () => edit.include([...picked], true) }>{ t.editor.includeSelected }</button>
                            <button type="button" className="btn btn-sm btn-ghost" disabled={ picked.size === 0 } onClick={ () => edit.include([...picked], false) }>{ t.editor.leaveOutSelected }</button>
                        </div>
                        <span className="bf-bulk-hint">{ t.editor.pickHint }</span>
                    </>
                ) : (
                    <div className="bf-bulk-buttons bf-bulk-segmented">
                        <button type="button" className="btn btn-sm btn-ghost" onClick={ () => edit.include(all, true) }>{ t.editor.includeAll }</button>
                        <button type="button" className="btn btn-sm btn-ghost" onClick={ () => edit.include(all, false) }>{ t.editor.leaveOutAll }</button>
                        <button type="button" className="btn btn-sm btn-ghost" onClick={ () => setPicking(true) }>{ t.editor.select }</button>
                    </div>
                ) }
            </div>

            { blocks.length === 0 && <p className="bf-muted">{ t.editor.empty }</p> }

            <div className={ `bf-blocks ${picking ? 'picking' : ''}` }>
                { blocks.map((block, offset) => {
                    const at = range.start + offset;
                    const next = book.blocks[at + 1];
                    return (
                        <Block
                            key={ block.id }
                            t={ t }
                            block={ block }
                            picking={ picking }
                            picked={ picked.has(at) }
                            selected={ !picking && selected === at }
                            canJoin={ next?.type === 'text' && block.type === 'text' }
                            onClick={ (event) => (picking ? pick(at, event.shiftKey) : onSelect(at)) }
                            onInclude={ (include) => edit.include([at], include) }
                            edit={ {
                                change: (changes) => edit.change(at, changes),
                                setType: (value) => edit.setType(at, value),
                                headingAbove: () => edit.headingAbove(at),
                                split: (offsetInText) => edit.split(at, offsetInText),
                                join: () => edit.join(at),
                            } }
                        />
                    );
                }) }
            </div>

            <nav className="bf-section-nav" aria-label={ t.editor.contents }>
                <button type="button" className="btn btn-ghost" disabled={ index === 0 } onClick={ () => onPick(index - 1) }>
                    { t.editor.previous }
                </button>
                <button type="button" className="btn btn-ghost d-inline-flex align-items-center gap-1" disabled={ index >= sections.length - 1 } onClick={ () => onPick(index + 1) }>
                    { t.editor.next } <ChevronRight size={ 16 } />
                </button>
            </nav>
        </>
    );
}

function Block({ t, block, picking, picked, selected, canJoin, onClick, onInclude, edit }) {
    const heading = block.type === 'heading';
    const textarea = useRef(null);
    const tags = [];
    if (block.role !== 'body') tags.push(t.editor.roles[block.role] || block.role);
    if (block.verse) tags.push(t.editor.verse);
    if (block.epigraph) tags.push(t.editor.epigraph);
    const notes = block.notes ? Object.keys(block.notes).length : 0;
    if (notes) tags.push(fill(t.editor.notesCount, { n: notes }));

    const classes = ['bf-block-card', heading ? 'heading' : 'text'];
    if (!block.include) classes.push('out');
    if (selected) classes.push('selected');
    if (picked) classes.push('picked');

    const text = block.verse && block.lines.length ? block.lines.join('\n') : block.text;
    const stop = (event) => event.stopPropagation();

    return (
        <article className={ classes.join(' ') } onClick={ onClick }>
            { picking ? (
                <input className="form-check-input bf-pick" type="checkbox" aria-label={ t.editor.selectParagraph } checked={ picked } readOnly tabIndex={ -1 } />
            ) : (
                <div className="form-check form-switch m-0" onClick={ stop }>
                    <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        aria-label={ t.editor.include }
                        checked={ block.include }
                        onChange={ (e) => onInclude(e.target.checked) }
                    />
                </div>
            ) }

            <div className="bf-block-body">
                { (tags.length > 0 || !block.include) && (
                    <div className="bf-block-tags">
                        { !block.include && <span className="bf-tag bf-tag-out">{ t.editor.leftOut }</span> }
                        { tags.map((tag) => <span className="bf-tag" key={ tag }>{ tag }</span>) }
                    </div>
                ) }

                { selected ? (
                    <div className="bf-block-edit" onClick={ stop }>
                        <div className="bf-block-fields">
                            <select
                                className="form-select form-select-sm bf-type"
                                aria-label={ t.editor.type }
                                value={ heading ? String(block.level) : 'text' }
                                onChange={ (e) => edit.setType(e.target.value) }
                            >
                                <option value="text">{ t.editor.kinds.text }</option>
                                { LEVELS.map((level) => (
                                    <option key={ level } value={ level }>
                                        { level === 1 ? t.editor.kinds.outermost : level === 6 ? t.editor.kinds.subheading : fill(t.editor.kinds.heading, { n: level }) }
                                    </option>
                                )) }
                            </select>
                            { heading && (
                                <>
                                    <input
                                        className="form-control form-control-sm bf-label"
                                        aria-label={ t.editor.label }
                                        placeholder={ t.editor.labelPlaceholder }
                                        value={ block.label }
                                        onChange={ (e) => edit.change({ label: e.target.value }) }
                                    />
                                    <input
                                        className="form-control form-control-sm bf-title-input"
                                        aria-label={ t.editor.title }
                                        placeholder={ t.editor.titlePlaceholder }
                                        value={ block.title || '' }
                                        onChange={ (e) => edit.change({ title: e.target.value || null }) }
                                    />
                                </>
                            ) }
                        </div>

                        { heading ? (
                            <p className="bf-block-note">{ t.editor.headingNote }</p>
                        ) : (
                            <>
                                <textarea
                                    ref={ textarea }
                                    className="form-control bf-block-textarea"
                                    aria-label={ t.editor.paragraphText }
                                    value={ text }
                                    rows={ Math.min(12, Math.max(3, Math.ceil(text.length / 70))) }
                                    onChange={ (e) => {
                                        const value = e.target.value;
                                        if (block.verse && block.lines.length) {
                                            const lines = value.split('\n');
                                            edit.change({ lines, text: lines.join(' ') });
                                        } else {
                                            edit.change({ text: value });
                                        }
                                    } }
                                />
                                <div className="bf-block-tools">
                                    <button type="button" className="btn btn-sm btn-ghost" onClick={ edit.headingAbove }>{ t.editor.headingAbove }</button>
                                    <button type="button" className="btn btn-sm btn-ghost" onClick={ () => edit.split(textarea.current?.selectionStart ?? 0) }>{ t.editor.split }</button>
                                    { canJoin && <button type="button" className="btn btn-sm btn-ghost" onClick={ edit.join }>{ t.editor.join }</button> }
                                </div>
                            </>
                        ) }
                    </div>
                ) : heading ? (
                    <div className="bf-block-heading">
                        <span className="bf-level">H{ block.level }</span>
                        <span className="fw-semibold">{ headingText(block) || t.editor.untitled }</span>
                    </div>
                ) : (
                    <p className={ `bf-block-text clamp ${block.verse ? 'verse' : ''}` }>{ text }</p>
                ) }
            </div>
            { block.page > 0 && <span className="bf-block-page">{ t.editor.page } { block.page }</span> }
        </article>
    );
}

// The PDF page the selected paragraph is printed on, or the same place in the EPUB.
function Preview({ t, id, page, pages, setPage, blockId, version, blocked }) {
    const [view, setView] = useState('pdf');

    return (
        <section className="bf-editor-card bf-preview">
            <div className="bf-preview-bar">
                <div className="bf-seg bf-preview-tabs" role="group" aria-label={ t.editor.previewTabs }>
                    <button type="button" className={ view === 'pdf' ? 'on' : '' } aria-pressed={ view === 'pdf' } onClick={ () => setView('pdf') }>{ t.editor.pdfTab }</button>
                    <button type="button" className={ view === 'epub' ? 'on' : '' } aria-pressed={ view === 'epub' } onClick={ () => setView('epub') }>{ t.editor.epubTab }</button>
                </div>
                { view === 'pdf' && <PageTurn t={ t } className="d-flex align-items-center gap-1" page={ page } count={ pages } onTurn={ setPage } /> }
            </div>
            { view === 'pdf' ? (
                <div className="bf-preview-page">
                    <img key={ page } src={ pageUrl(id, page) } alt={ fill(t.editor.pageAlt, { n: page }) } />
                </div>
            ) : (
                <EpubPreview t={ t } id={ id } blockId={ blockId } version={ version } blocked={ blocked } />
            ) }
        </section>
    );
}

// Arrows either side of "Page n of count"; pages count from 1.
function PageTurn({ t, className, page, count, onTurn }) {
    return (
        <div className={ className }>
            <button type="button" className="bf-icon-btn bf-icon-btn-sm" aria-label={ t.editor.previousPage } disabled={ page <= 1 } onClick={ () => onTurn(page - 1) }>
                <ChevronRight size={ 16 } style={ { transform: 'rotate(180deg)' } } />
            </button>
            <span className="small fw-medium px-1">{ fill(t.editor.pageOf, { n: page, total: count }) }</span>
            <button type="button" className="bf-icon-btn bf-icon-btn-sm" aria-label={ t.editor.nextPage } disabled={ page >= count } onClick={ () => onTurn(page + 1) }>
                <ChevronRight size={ 16 } />
            </button>
        </div>
    );
}

// The EPUB page, written by the engine with its own stylesheet and fonts, shown the way
// an e-reader shows it: page-sized, a page at a time.
function EpubPreview({ t, id, blockId, version, blocked }) {
    const [page, setPage] = useState(null);
    const [error, setError] = useState('');
    const [at, setAt] = useState(0);
    const [count, setCount] = useState(1);
    const frame = useRef(null);

    // The page is fetched as text, like every other API call, and shown in the frame
    // with a <base> pointing into the EPUB, so its stylesheet, fonts and images load from
    // there. Navigating the frame to the page instead would depend on the dev server
    // sending page requests to Django.
    useEffect(() => {
        if (blocked || !blockId) return undefined;
        let stale = false;
        setError('');
        getPreviewUrl(id, blockId)
            .then(getPreviewPage)
            .then((html) => !stale && setPage(html.replace(/<\/head>/i, `${PAGED}</head>`)))
            .catch((e) => !stale && setError(e.code === 'problems' ? 'problems' : 'error'));
        return () => {
            stale = true;
        };
    }, [id, blockId, version, blocked]);

    const frameDoc = () => frame.current?.contentDocument?.documentElement;

    // The section is laid out in columns one frame wide; each column is a page.
    function measure() {
        const doc = frameDoc();
        if (!doc) return;
        setCount(Math.max(1, Math.round(doc.scrollWidth / doc.clientWidth)));
        setAt(0);
        doc.scrollLeft = 0;
    }

    function turn(to) {
        const doc = frameDoc();
        if (!doc) return;
        setAt(to);
        doc.scrollLeft = to * doc.clientWidth;
    }

    if (blocked || error === 'problems') return <p className="bf-muted small mb-0">{ t.editor.epubProblems }</p>;
    if (error) return <p className="bf-muted small mb-0">{ t.editor.epubError }</p>;
    return (
        <>
            <div className="bf-preview-epub">
                { page && (
                    <iframe
                        ref={ frame }
                        srcDoc={ page }
                        title={ t.editor.epubFrame }
                        sandbox="allow-same-origin"
                        onLoad={ () => {
                            measure();
                            // The embedded fonts can change the layout once they've loaded.
                            frame.current?.contentDocument?.fonts?.ready.then(measure);
                        } }
                    />
                ) }
            </div>
            <PageTurn t={ t } className="bf-preview-turn" page={ at + 1 } count={ count } onTurn={ (to) => turn(to - 1) } />
        </>
    );
}

// Lays the EPUB page out like an e-reader: columns exactly one frame wide (the gap
// equals the side margins, so each column starts a frame-width further on), and no
// scrolling of its own; the arrows move from column to column.
const PAGED = `<style>
html { height: 100%; overflow: hidden; }
body {
    box-sizing: border-box;
    height: 100vh;
    margin: 0 !important;
    padding: 28px 24px !important;
    column-width: calc(100vw - 48px);
    column-gap: 48px;
    column-fill: auto;
}
img, svg { max-width: 100%; max-height: calc(100vh - 56px); }
</style>`;

export default Editor;
