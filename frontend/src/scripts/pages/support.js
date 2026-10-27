import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DONATE, ENGINE_URL, REPORT_URL } from '../helpers/links';
import { useSettings } from '../helpers/settings';
import { Heart } from '../includes/icons';

function Support() {
    const { t } = useSettings();
    // What was last copied: 'zelle' or 'link'
    const [copied, setCopied] = useState('');

    async function copy(text, what) {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(what);
        } catch {}
    }

    // The phone's own share sheet where there is one; elsewhere, the link is copied.
    function share() {
        const url = window.location.origin;
        if (navigator.share) navigator.share({ title: 'Bookflow', text: t.support.shareText, url }).catch(() => {});
        else copy(url, 'link');
    }

    return (
        <section className="container bf-section bf-fill bf-support-page">
            <div className="bf-support-grid">
                <div className="bf-letter">
                    <h1 className="bf-display bf-page-title bf-optical-top mb-4">{ t.support.title }</h1>
                    { t.support.note.map((line) => <p key={ line } className="fs-5">{ line }</p>) }
                    <p className="fs-5 mb-0">{ t.support.signature }</p>
                </div>

                <div className="bf-donate">
                    <span className="bf-donate-mark"><Heart size={ 22 } /></span>
                    <h2 className="bf-display bf-card-title mb-2">{ t.support.donate }</h2>
                    <p className="bf-donate-text mb-4">{ t.support.donateText }</p>

                    { DONATE.paypal && (
                        <div className="bf-way">
                            <div>
                                <div className="fw-semibold">PayPal</div>
                                <div className="bf-way-note">{ t.support.paypalNote }</div>
                            </div>
                            <a href={ DONATE.paypal } className="btn btn-white px-4">{ t.support.paypalButton }</a>
                        </div>
                    ) }
                    { DONATE.zelle && (
                        <div className="bf-way">
                            <div>
                                <div className="fw-semibold">Zelle</div>
                                <div className="bf-way-note">{ t.support.zelleNote }</div>
                                <code className="bf-way-value">{ DONATE.zelle }</code>
                            </div>
                            <button type="button" className="btn btn-white-outline px-4" onClick={ () => copy(DONATE.zelle, 'zelle') }>
                                { copied === 'zelle' ? t.support.copied : t.support.copy }
                            </button>
                        </div>
                    ) }
                    { !DONATE.paypal && !DONATE.zelle && <p className="bf-way-note mb-0">{ t.support.soon }</p> }
                </div>
            </div>

            <p className="bf-other-ways">
                <span className="bf-muted">{ t.support.otherWays }</span>
                <a href={ ENGINE_URL }>{ t.support.star }</a>
                <Link to="/suggest">{ t.nav.suggest }</Link>
                <a href={ REPORT_URL }>{ t.support.report }</a>
                <button type="button" onClick={ share }>{ copied === 'link' ? t.support.linkCopied : t.support.share }</button>
            </p>
        </section>
    );
}

export default Support;
