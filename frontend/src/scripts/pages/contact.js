import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { errorCode, sendContact } from '../helpers/api';
import { MAX_PDF_MB, pdfProblem } from '../helpers/files';
import { fileSize, fill } from '../helpers/format';
import { CODE_URL, CONTACT_EMAIL, ENGINE_URL, REPORT_URL } from '../helpers/links';
import { useSettings } from '../helpers/settings';
import { FieldLabel, FormPage, SendRow, Sent, Trap, useFields } from '../includes/forms';
import { Close, FileIcon } from '../includes/icons';
import { usePageTitle } from '../includes/page';
import SideList from '../includes/side-list';

// What a message can be about; ?kind= picks one, so other pages can link to it.
const KINDS = ['message', 'problem', 'book', 'copyright'];
const RIGHTS = ['public_domain', 'permission', 'unsure'];
// The same limits the server checks
const MAX_TEXT = 5000;
const MAX_NOTE = 2000;

const EMPTY = { name: '', email: '', link: '', text: '', title: '', author: '', note: '', rights: '', holder: '', website: '' };

function Contact() {
    const { t, lang } = useSettings();
    usePageTitle(t.nav.contact);
    const [params, setParams] = useSearchParams();
    const kind = KINDS.includes(params.get('kind')) ? params.get('kind') : 'message';
    const [fields, set, reset] = useFields(EMPTY);
    const [pdf, setPdf] = useState(null);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const sending = progress !== null;
    const book = kind === 'book';
    const copyright = kind === 'copyright';
    const permission = book && pdf && fields.rights === 'permission';
    const errors = book ? t.suggest.errors : t.contact.errors;

    function choose(event) {
        setError('');
        setParams(event.target.value === 'message' ? {} : { kind: event.target.value }, { replace: true });
    }

    function pickPdf(file) {
        setError('');
        if (!file) return;
        const problem = pdfProblem(file);
        if (problem) setError(problem);
        else setPdf(file);
    }

    // What the server would refuse, caught before sending.
    function missing() {
        if (book) {
            if (!fields.title.trim()) return 'no_title';
            if (pdf && !fields.rights) return 'no_rights';
            if (permission && !fields.holder.trim()) return 'no_holder';
            return '';
        }
        if (copyright && !fields.link.trim()) return 'no_link';
        if (!fields.text.trim()) return 'no_text';
        if (copyright && !fields.email.trim()) return 'no_email';
        return '';
    }

    // Only the fields of the chosen kind.
    function posted() {
        const { name, email, link, text, title, author, note, rights, holder, website } = fields;
        if (book) {
            return { kind, title, author, note, pdf, rights: pdf ? rights : '', holder: permission ? holder : '', email, lang, website };
        }
        return { kind, name, email, link: kind === 'message' ? '' : link, text, website };
    }

    async function send(event) {
        event.preventDefault();
        if (sending) return;
        const problem = missing();
        if (problem) return setError(problem);
        setError('');
        setProgress(0);
        try {
            await sendContact(posted(), setProgress);
            setSent(true);
        } catch (e) {
            setError(errorCode(e, errors));
        } finally {
            setProgress(null);
        }
    }

    function again() {
        reset();
        setPdf(null);
        setSent(false);
    }

    const elsewhere = [
        { mark: '!', name: t.contact.report, text: <>{ t.contact.reportText } <a href={ REPORT_URL }>{ t.contact.reportLink }</a></> },
        { mark: '¶', name: t.nav.library, text: <>{ t.contact.libraryText } <Link to="/library">{ t.contact.libraryLink }</Link></> },
        {
            mark: '#',
            name: t.contact.code,
            text: <>{ t.contact.codeText } <a href={ CODE_URL }>Bookflow</a> · <a href={ ENGINE_URL }>PDF2EPUB</a></>,
        },
    ];
    const side = book
        ? <SideList title={ t.suggest.nextTitle } items={ t.suggest.next.map((item, index) => ({ ...item, mark: index + 1 })) } />
        : <SideList title={ t.contact.elsewhere } items={ elsewhere } />;

    let sendLabel = t.contact.send;
    if (book) sendLabel = t.suggest.send;
    else if (kind === 'problem') sendLabel = t.contact.sendProblem;
    let sendingLabel = t.contact.sending;
    if (book) sendingLabel = fill(t.suggest.sending, { percent: Math.round(progress * 100) });

    if (sent) {
        return (
            <FormPage title={ t.contact.title } lead={ t.contact.lead } side={ side }>
                { book ? (
                    <Sent title={ t.suggest.sentTitle } text={ t.suggest.sentText }>
                        <button type="button" className="btn btn-cobalt px-4" onClick={ again }>{ t.suggest.another }</button>
                        <Link to="/library" className="btn btn-ghost px-4">{ t.home.browse }</Link>
                    </Sent>
                ) : (
                    <Sent title={ t.contact.sentTitle } text={ t.contact.sentText }>
                        <button type="button" className="btn btn-cobalt px-4" onClick={ again }>{ t.contact.another }</button>
                    </Sent>
                ) }
            </FormPage>
        );
    }

    return (
        <FormPage title={ t.contact.title } lead={ t.contact.lead } side={ side }>
            <form className="bf-panel h-100 p-4 p-lg-5" onSubmit={ send } noValidate>
                <div className="row g-3 align-items-end">
                    <div className="col-12">
                        <FieldLabel htmlFor="bf-c-kind">{ t.contact.kind }</FieldLabel>
                        <select id="bf-c-kind" className="form-select" value={ kind } onChange={ choose }>
                            { KINDS.map((value) => <option key={ value } value={ value }>{ t.contact.kinds[value] }</option>) }
                        </select>
                    </div>

                    { book ? (
                        <BookFields fields={ fields } set={ set } pdf={ pdf } pickPdf={ pickPdf } removePdf={ () => setPdf(null) } />
                    ) : (
                        <>
                            <div className="col-md-6">
                                <FieldLabel htmlFor="bf-c-name" optional={ t.suggest.optional }>{ t.contact.name }</FieldLabel>
                                <input id="bf-c-name" className="form-control" autoComplete="name" maxLength={ 200 } value={ fields.name } onChange={ set('name') } />
                            </div>
                            <div className="col-md-6">
                                <FieldLabel htmlFor="bf-c-email" optional={ copyright ? null : t.suggest.optional }>{ t.suggest.email }</FieldLabel>
                                <input id="bf-c-email" type="email" className="form-control" autoComplete="email" value={ fields.email } onChange={ set('email') } />
                            </div>
                            { kind !== 'message' && (
                                <div className="col-12">
                                    <FieldLabel htmlFor="bf-c-link" optional={ copyright ? null : t.suggest.optional }>
                                        { copyright ? t.contact.copyrightLink : t.contact.problemLink }
                                    </FieldLabel>
                                    <input
                                        id="bf-c-link"
                                        className="form-control"
                                        maxLength={ 500 }
                                        placeholder={ copyright ? t.contact.copyrightLinkPlaceholder : t.contact.problemLinkPlaceholder }
                                        value={ fields.link }
                                        onChange={ set('link') }
                                    />
                                </div>
                            ) }
                            <div className="col-12">
                                <FieldLabel htmlFor="bf-c-text">
                                    { { message: t.contact.message, problem: t.contact.problemText, copyright: t.contact.copyrightText }[kind] }
                                </FieldLabel>
                                <textarea
                                    id="bf-c-text"
                                    className="form-control"
                                    rows={ 6 }
                                    maxLength={ MAX_TEXT }
                                    placeholder={ copyright ? t.contact.copyrightTextPlaceholder : undefined }
                                    value={ fields.text }
                                    onChange={ set('text') }
                                />
                                <div className="form-text bf-muted">{ copyright ? t.contact.copyrightEmailHint : t.contact.emailHint }</div>
                            </div>
                        </>
                    ) }
                    <Trap value={ fields.website } onChange={ set('website') } />
                </div>

                { error && <div className="bf-alert mt-4" role="alert">{ fill(errors[error], { mb: MAX_PDF_MB, n: MAX_NOTE }) }</div> }

                <SendRow>
                    <button type="submit" className="btn btn-cobalt btn-lg px-4" disabled={ sending }>
                        { sending ? sendingLabel : sendLabel }
                    </button>
                    <span className="bf-muted">
                        { t.contact.orWrite } <a href={ `mailto:${CONTACT_EMAIL}` }>{ CONTACT_EMAIL }</a>
                    </span>
                </SendRow>
            </form>
        </FormPage>
    );
}

// A suggested book: its title and author, a note, the PDF and whether it may be shared.
function BookFields({ fields, set, pdf, pickPdf, removePdf }) {
    const { t } = useSettings();

    return (
        <>
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
                        <span className="bf-muted small">{ fileSize(pdf.size, t.units) }</span>
                        <button type="button" className="bf-icon-btn bf-icon-btn-sm" aria-label={ t.suggest.removePdf } onClick={ removePdf }><Close size={ 16 } /></button>
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

            { pdf && fields.rights === 'permission' && (
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
        </>
    );
}

export default Contact;
