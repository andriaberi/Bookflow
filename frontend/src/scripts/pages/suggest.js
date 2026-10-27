import { useState } from 'react';
import { Link } from 'react-router-dom';
import { errorCode, suggestBook } from '../helpers/api';
import { MAX_PDF_MB, pdfProblem } from '../helpers/files';
import { fill, megabytes } from '../helpers/format';
import { useSettings } from '../helpers/settings';
import { FieldLabel, Sent } from '../includes/forms';
import { Close, FileIcon } from '../includes/icons';
import SideList from '../includes/side-list';

const EMPTY = { title: '', author: '', note: '', rights: '', holder: '', email: '', website: '' };
const RIGHTS = ['public_domain', 'permission', 'unsure'];
// The same limit the server checks
const MAX_NOTE = 2000;

function Suggest() {
    const { t, lang } = useSettings();
    const [fields, setFields] = useState(EMPTY);
    const [pdf, setPdf] = useState(null);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const sending = progress !== null;
    const permission = pdf && fields.rights === 'permission';
    const set = (name) => (e) => setFields((old) => ({ ...old, [name]: e.target.value }));

    function pickPdf(file) {
        setError('');
        if (!file) return;
        const problem = pdfProblem(file);
        if (problem) setError(problem);
        else setPdf(file);
    }

    async function send(event) {
        event.preventDefault();
        if (sending) return;
        if (!fields.title.trim()) return setError('no_title');
        if (pdf && !fields.rights) return setError('no_rights');
        if (permission && !fields.holder.trim()) return setError('no_holder');
        setError('');
        setProgress(0);
        try {
            await suggestBook({ ...fields, rights: pdf ? fields.rights : '', holder: permission ? fields.holder : '', pdf, lang }, setProgress);
            setSent(true);
        } catch (e) {
            setError(errorCode(e, t.suggest.errors));
        } finally {
            setProgress(null);
        }
    }

    function again() {
        setFields(EMPTY);
        setPdf(null);
        setSent(false);
    }

    return (
        <section className="container bf-section bf-fill bf-suggest">
            <header className="bf-center-stacked bf-convert-header">
                <h1 className="bf-display bf-page-title bf-optical-top mb-3">{ t.suggest.title }</h1>
                <p className="fs-5 bf-muted bf-page-lead mb-0">{ t.suggest.lead }</p>
            </header>

            <div className="row g-4">
                <div className="col-lg-7">
                    { sent ? (
                        <Sent title={ t.suggest.sentTitle } text={ t.suggest.sentText }>
                            <button type="button" className="btn btn-cobalt px-4" onClick={ again }>{ t.suggest.another }</button>
                            <Link to="/library" className="btn btn-ghost px-4">{ t.home.browse }</Link>
                        </Sent>
                    ) : (
                        <form className="bf-panel bf-suggest-form p-4 p-lg-5" onSubmit={ send } noValidate>
                            <div className="row g-3 align-items-end">
                                <div className="col-md-7">
                                    <FieldLabel htmlFor="bf-s-title">{ t.suggest.bookTitle }</FieldLabel>
                                    <input id="bf-s-title" className="form-control" required maxLength={ 300 } value={ fields.title } onChange={ set('title') } />
                                </div>
                                <div className="col-md-5">
                                    <FieldLabel htmlFor="bf-s-author" optional={ t.suggest.optional }>{ t.suggest.author }</FieldLabel>
                                    <input id="bf-s-author" className="form-control" maxLength={ 200 } value={ fields.author } onChange={ set('author') } />
                                </div>
                                <div className="col-12">
                                    <FieldLabel htmlFor="bf-s-note" optional={ t.suggest.optional }>{ t.suggest.note }</FieldLabel>
                                    <textarea id="bf-s-note" className="form-control" rows={ 3 } maxLength={ MAX_NOTE } placeholder={ t.suggest.notePlaceholder } value={ fields.note } onChange={ set('note') } />
                                </div>

                                <div className="col-12">
                                    <FieldLabel optional={ t.suggest.optional }>{ t.suggest.pdf }</FieldLabel>
                                    { pdf ? (
                                        <div className="bf-file">
                                            <FileIcon size={ 20 } />
                                            <span className="bf-file-name">{ pdf.name }</span>
                                            <span className="bf-muted small">{ megabytes(pdf.size) } { t.reading.mb }</span>
                                            <button type="button" className="bf-icon-btn bf-icon-btn-sm" aria-label={ t.suggest.removePdf } onClick={ () => setPdf(null) }><Close size={ 16 } /></button>
                                        </div>
                                    ) : (
                                        <label className="bf-file bf-file-pick">
                                            <FileIcon size={ 20 } />
                                            <span>{ t.suggest.attach }</span>
                                            <span className="bf-muted small">{ fill(t.convert.limit, { mb: MAX_PDF_MB }) }</span>
                                            <input type="file" accept="application/pdf,.pdf" className="visually-hidden" onChange={ (e) => { pickPdf(e.target.files[0]); e.target.value = ''; } } />
                                        </label>
                                    ) }
                                </div>

                                { pdf && (
                                    <div className="col-12">
                                        <fieldset>
                                            <legend className="form-label fw-medium fs-6">{ t.suggest.rights }</legend>
                                            { RIGHTS.map((value) => (
                                                <div className="form-check" key={ value }>
                                                    <input className="form-check-input" type="radio" name="rights" id={ `bf-rights-${value}` } value={ value } checked={ fields.rights === value } onChange={ set('rights') } />
                                                    <label className="form-check-label" htmlFor={ `bf-rights-${value}` }>{ t.suggest.rightsChoices[value] }</label>
                                                </div>
                                            )) }
                                        </fieldset>
                                    </div>
                                ) }

                                { permission && (
                                    <div className="col-12">
                                        <FieldLabel htmlFor="bf-s-holder">{ t.suggest.holder }</FieldLabel>
                                        <input id="bf-s-holder" className="form-control" maxLength={ 200 } placeholder={ t.suggest.holderPlaceholder } value={ fields.holder } onChange={ set('holder') } />
                                    </div>
                                ) }

                                <div className="col-12">
                                    <FieldLabel htmlFor="bf-s-email" optional={ t.suggest.optional }>{ t.suggest.email }</FieldLabel>
                                    <input id="bf-s-email" type="email" className="form-control" autoComplete="email" value={ fields.email } onChange={ set('email') } />
                                    <div className="form-text bf-muted">{ t.suggest.emailHint }</div>
                                </div>

                                {/* Left empty by people, who never see it; bots fill it in. */}
                                <div className="visually-hidden" aria-hidden="true">
                                    <input name="website" tabIndex={ -1 } autoComplete="off" value={ fields.website } onChange={ set('website') } />
                                </div>
                            </div>

                            { error && (
                                <div className="bf-alert mt-4" role="alert">{ fill(t.suggest.errors[error], { mb: MAX_PDF_MB, n: MAX_NOTE }) }</div>
                            ) }

                            <button type="submit" className="btn btn-cobalt btn-lg px-4 mt-4" disabled={ sending }>
                                { sending ? fill(t.suggest.sending, { percent: Math.round(progress * 100) }) : t.suggest.send }
                            </button>
                        </form>
                    ) }
                </div>

                <div className="col-lg-5">
                    <SideList title={ t.suggest.nextTitle } items={ t.suggest.next.map((item, index) => ({ ...item, mark: index + 1 })) } />
                </div>
            </div>
        </section>
    );
}

export default Suggest;
