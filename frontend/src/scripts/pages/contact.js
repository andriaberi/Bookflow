import { useState } from 'react';
import { Link } from 'react-router-dom';
import { errorCode, sendMessage } from '../helpers/api';
import { REPORT_URL } from '../helpers/links';
import { useSettings } from '../helpers/settings';
import { FieldLabel, Sent } from '../includes/forms';
import SideList from '../includes/side-list';

const EMPTY = { name: '', email: '', text: '', website: '' };
// The same limit the server checks
const MAX_TEXT = 5000;

function Contact() {
    const { t } = useSettings();
    const [fields, setFields] = useState(EMPTY);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const set = (name) => (e) => setFields((old) => ({ ...old, [name]: e.target.value }));

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
    ];

    return (
        <section className="container bf-section bf-fill bf-contact">
            <header className="bf-center-stacked bf-convert-header">
                <h1 className="bf-display bf-page-title bf-optical-top mb-3">{ t.contact.title }</h1>
                <p className="fs-5 bf-muted bf-page-lead mb-0">{ t.contact.lead }</p>
            </header>

            <div className="row g-4">
                <div className="col-lg-7">
                    { sent ? (
                        <Sent title={ t.contact.sentTitle } text={ t.contact.sentText }>
                            <button type="button" className="btn btn-cobalt px-4" onClick={ () => { setFields(EMPTY); setSent(false); } }>{ t.contact.another }</button>
                        </Sent>
                    ) : (
                        <form className="bf-panel p-4 p-lg-5" onSubmit={ send } noValidate>
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

                                {/* Left empty by people, who never see it; bots fill it in. */}
                                <div className="visually-hidden" aria-hidden="true">
                                    <input name="website" tabIndex={ -1 } autoComplete="off" value={ fields.website } onChange={ set('website') } />
                                </div>
                            </div>

                            { error && <div className="bf-alert mt-4" role="alert">{ t.contact.errors[error] }</div> }

                            <button type="submit" className="btn btn-cobalt btn-lg px-4 mt-4" disabled={ sending }>
                                { sending ? t.contact.sending : t.contact.send }
                            </button>
                        </form>
                    ) }
                </div>

                <div className="col-lg-5">
                    <SideList title={ t.contact.elsewhere } items={ elsewhere } />
                </div>
            </div>
        </section>
    );
}

export default Contact;
