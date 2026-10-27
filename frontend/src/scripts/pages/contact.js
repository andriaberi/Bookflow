import { useState } from 'react';
import { Link } from 'react-router-dom';
import { errorCode, sendMessage } from '../helpers/api';
import { CODE_URL, CONTACT_EMAIL, ENGINE_URL, REPORT_URL } from '../helpers/links';
import { useSettings } from '../helpers/settings';
import { FieldLabel, FormPage, Sent, Trap, useFields } from '../includes/forms';
import { usePageTitle } from '../includes/page';
import SideList from '../includes/side-list';

// The same limit the server checks
const MAX_TEXT = 5000;

function Contact() {
    const { t } = useSettings();
    usePageTitle(t.nav.contact);
    const [fields, set, reset] = useFields({ name: '', email: '', text: '', website: '' });
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    async function send(event) {
        event.preventDefault();
        if (sending) return;
        if (!fields.text.trim()) return setError('no_text');
        setError('');
        setSending(true);
        try {
            await sendMessage(fields);
            setSent(true);
        } catch (e) {
            setError(errorCode(e, t.contact.errors));
        } finally {
            setSending(false);
        }
    }

    const elsewhere = [
        { mark: '!', name: t.contact.report, text: <>{ t.contact.reportText } <a href={ REPORT_URL }>{ t.contact.reportLink }</a></> },
        { mark: '+', name: t.nav.suggest, text: <>{ t.contact.suggestText } <Link to="/suggest">{ t.contact.suggestLink }</Link></> },
        { mark: '¶', name: t.nav.library, text: <>{ t.contact.libraryText } <Link to="/library">{ t.contact.libraryLink }</Link></> },
        {
            mark: '#',
            name: t.contact.code,
            text: <>{ t.contact.codeText } <a href={ CODE_URL }>Bookflow</a> · <a href={ ENGINE_URL }>PDF2EPUB</a></>,
        },
    ];

    return (
        <FormPage title={ t.contact.title } lead={ t.contact.lead } side={ <SideList title={ t.contact.elsewhere } items={ elsewhere } /> }>
            { sent ? (
                <Sent title={ t.contact.sentTitle } text={ t.contact.sentText }>
                    <button type="button" className="btn btn-cobalt px-4" onClick={ () => { reset(); setSent(false); } }>{ t.contact.another }</button>
                </Sent>
            ) : (
                <form className="bf-panel h-100 p-4 p-lg-5" onSubmit={ send } noValidate>
                    <div className="row g-3 align-items-end">
                        <div className="col-md-6">
                            <FieldLabel htmlFor="bf-c-name" optional={ t.suggest.optional }>{ t.contact.name }</FieldLabel>
                            <input id="bf-c-name" className="form-control" autoComplete="name" maxLength={ 200 } value={ fields.name } onChange={ set('name') } />
                        </div>
                        <div className="col-md-6">
                            <FieldLabel htmlFor="bf-c-email" optional={ t.suggest.optional }>{ t.suggest.email }</FieldLabel>
                            <input id="bf-c-email" type="email" className="form-control" autoComplete="email" value={ fields.email } onChange={ set('email') } />
                        </div>
                        <div className="col-12">
                            <FieldLabel htmlFor="bf-c-text">{ t.contact.message }</FieldLabel>
                            <textarea id="bf-c-text" className="form-control" rows={ 6 } maxLength={ MAX_TEXT } value={ fields.text } onChange={ set('text') } />
                            <div className="form-text bf-muted">{ t.contact.emailHint }</div>
                        </div>
                        <Trap value={ fields.website } onChange={ set('website') } />
                    </div>

                    { error && <div className="bf-alert mt-4" role="alert">{ t.contact.errors[error] }</div> }

                    <div className="bf-send-row mt-4">
                        <button type="submit" className="btn btn-cobalt btn-lg px-4" disabled={ sending }>
                            { sending ? t.contact.sending : t.contact.send }
                        </button>
                        <span className="bf-muted">
                            { t.contact.orWrite } <a href={ `mailto:${CONTACT_EMAIL}` }>{ CONTACT_EMAIL }</a>
                        </span>
                    </div>
                </form>
            ) }
        </FormPage>
    );
}

export default Contact;
