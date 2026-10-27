import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DONATE_URL, ENGINE_URL, REPORT_URL } from '../helpers/links';
import { useSettings } from '../helpers/settings';
import { Flag, Heart, Plus, Share, Star } from '../includes/icons';

function Support() {
    const { t } = useSettings();
    const [shared, setShared] = useState(false);

    // The phone's own share sheet where there is one; elsewhere, the link is copied.
    async function share() {
        const url = window.location.origin;
        try {
            if (navigator.share) await navigator.share({ title: 'Bookflow', text: t.support.shareText, url });
            else {
                await navigator.clipboard.writeText(url);
                setShared(true);
            }
        } catch {}
    }

    const ways = [
        { icon: Star, name: t.support.star, text: t.support.starText, action: <a href={ ENGINE_URL } className="btn btn-ghost px-4">{ t.support.starButton }</a> },
        { icon: Plus, name: t.nav.suggest, text: t.support.suggestText, action: <Link to="/suggest" className="btn btn-ghost px-4">{ t.support.suggestButton }</Link> },
        { icon: Flag, name: t.support.report, text: t.support.reportText, action: <a href={ REPORT_URL } className="btn btn-ghost px-4">{ t.support.reportButton }</a> },
        {
            icon: Share,
            name: t.support.share,
            text: t.support.shareHelp,
            action: <button type="button" className="btn btn-ghost px-4" onClick={ share }>{ shared ? t.support.copied : t.support.shareButton }</button>,
        },
    ];

    return (
        <section className="container bf-section bf-fill bf-support-page">
            <header className="bf-center-stacked bf-convert-header">
                <h1 className="bf-display bf-page-title bf-optical-top mb-3">{ t.support.title }</h1>
                <p className="fs-5 bf-muted bf-page-lead mb-0">{ t.support.lead }</p>
            </header>

            { DONATE_URL && (
                <div className="bf-support p-4 p-lg-5 mb-4">
                    <div className="bf-support-inner">
                        <div className="bf-support-text">
                            <h2 className="bf-display bf-card-title mb-2">{ t.support.donate }</h2>
                            <p className="fs-5 mb-0">{ t.support.donateText }</p>
                        </div>
                        <div className="bf-support-actions">
                            <a href={ DONATE_URL } className="btn btn-lg btn-white px-4 py-3 d-inline-flex align-items-center gap-2">
                                <Heart size={ 18 } />
                                { t.support.donateButton }
                            </a>
                        </div>
                    </div>
                </div>
            ) }

            <ul className="bf-ways">
                { ways.map(({ icon: Icon, name, text, action }) => (
                    <li key={ name } className="bf-panel bf-way">
                        <span className="bf-icon-tile mb-3"><Icon size={ 22 } /></span>
                        <h2 className="fs-5 fw-semibold mb-2">{ name }</h2>
                        <p className="bf-muted mb-4">{ text }</p>
                        <div className="mt-auto">{ action }</div>
                    </li>
                )) }
            </ul>

            <div className="bf-promises">
                { t.support.promises.map((promise) => (
                    <div key={ promise.name }>
                        <div className="fw-semibold mb-1">{ promise.name }</div>
                        <div className="small bf-muted">{ promise.text }</div>
                    </div>
                )) }
            </div>
        </section>
    );
}

export default Support;
