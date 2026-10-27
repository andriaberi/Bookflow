import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getConversion } from '../helpers/api';
import { fileSize, fill } from '../helpers/format';
import { useConversionOpen } from '../helpers/presence';
import { useSettings } from '../helpers/settings';
import { Check, FileIcon } from '../includes/icons';
import Message from '../includes/message';
import { usePageTitle } from '../includes/page';

// How often to ask the server how far the reading has got.
const POLL_MS = 500;

function Reading() {
    const { t } = useSettings();
    const { id } = useParams();
    const [conversion, setConversion] = useState(null);
    const [missing, setMissing] = useState(false);
    useConversionOpen(id);
    usePageTitle(conversion?.name);

    // Ask again until the book is ready or reading has failed.
    useEffect(() => {
        let timer;
        let stopped = false;

        async function poll() {
            try {
                const data = await getConversion(id);
                if (stopped) return;
                setConversion(data);
                if (data.status === 'reading') timer = setTimeout(poll, POLL_MS);
            } catch (e) {
                if (stopped) return;
                if (e.code === 'not_found') setMissing(true);
                else timer = setTimeout(poll, POLL_MS * 4);
            }
        }

        poll();
        return () => {
            stopped = true;
            clearTimeout(timer);
        };
    }, [id]);

    if (missing) {
        return (
            <Message title={ t.reading.notFound }>
                <p className="bf-muted fs-5 mb-4">{ t.reading.notFoundLead }</p>
                <Link to="/convert" className="btn btn-cobalt px-4">{ t.reading.tryAgain }</Link>
            </Message>
        );
    }

    const status = conversion?.status || 'reading';

    return (
        <section className="container bf-section bf-fill">
            <div className="bf-reading-card">
                <div className="bf-reading-cover">
                    { conversion?.cover_url ? (
                        <img src={ conversion.cover_url } alt="" />
                    ) : (
                        <span className="bf-reading-file"><FileIcon size={ 56 } strokeWidth={ 1.5 } /></span>
                    ) }
                    { status === 'ready' && (
                        <span className="bf-badge">{ conversion.cover_url ? t.reading.coverFound : t.reading.noCover }</span>
                    ) }
                </div>

                <div className="bf-reading-body bf-center-stacked">
                    { conversion && (
                        <div className="bf-reading-file-line small bf-muted mb-3">
                            <span className="fw-medium bf-reading-name">{ conversion.name }.pdf</span>
                            <span>{ fileSize(conversion.size, t.units) }</span>
                            <span>{ fill(t.reading.pages, { n: conversion.pages }) }</span>
                        </div>
                    ) }

                    <h1 className="bf-display bf-reading-title mb-3" aria-live="polite">{ t.reading[status] }</h1>
                    <p className="bf-reading-lead bf-muted mb-4">{ t.reading[`${status}Lead`] }</p>

                    { status === 'reading' && <Steps t={ t } step={ conversion?.step || 0 } /> }
                    { status === 'ready' && <Summary t={ t } book={ conversion.book } /> }
                    { status === 'failed' && conversion.error && (
                        <div className="bf-alert mb-4" role="alert">{ conversion.error }</div>
                    ) }

                    <div className="bf-cta bf-reading-actions">
                        { status === 'ready' && (
                            <Link to={ `/convert/${id}/edit` } className="btn btn-cobalt btn-lg px-4">{ t.reading.edit }</Link>
                        ) }
                        <Link to="/convert" className="btn btn-ghost btn-lg px-4">
                            { status === 'failed' ? t.reading.tryAgain : t.reading.another }
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

// pdf2epub's three reading steps: done, running or still to come.
function Steps({ t, step }) {
    const steps = t.reading.steps;
    return (
        <>
            <div className="bf-steps-bar mb-4" role="progressbar" aria-label={ t.reading.progress } aria-valuenow={ step } aria-valuemin="0" aria-valuemax={ steps.length }>
                { steps.map((name, index) => (
                    <span key={ name } className={ index < step ? 'done' : index === step ? 'now' : '' } />
                )) }
            </div>
            <ol className="bf-steps mb-4">
                { steps.map((name, index) => {
                    const state = index < step ? 'done' : index === step ? 'now' : 'next';
                    return (
                        <li key={ name } className={ state }>
                            <span className="bf-step-mark" aria-hidden="true">
                                { state === 'done' && <Check size={ 14 } /> }
                                { state === 'now' && <span className="spinner-border" /> }
                            </span>
                            { name }
                        </li>
                    );
                }) }
            </ol>
        </>
    );
}

// What Bookflow found: the title and author, and how many chapters, paragraphs and notes.
function Summary({ t, book }) {
    const counts = [
        [book.headings, t.reading.chapters],
        [book.paragraphs, t.reading.paragraphs],
        [book.notes, t.reading.notes],
    ];
    return (
        <div className="mb-4">
            <div className="fw-semibold fs-5">{ book.title || t.reading.untitled }</div>
            <div className="bf-muted mb-3">{ book.author || t.reading.unknownAuthor }</div>
            <div className="bf-counts">
                { counts.map(([count, label]) => (
                    <div key={ label }>
                        <div className="bf-display bf-count">{ count }</div>
                        <div className="small bf-muted">{ label }</div>
                    </div>
                )) }
            </div>
        </div>
    );
}

export default Reading;
