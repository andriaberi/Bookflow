import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInfo } from '../helpers/api';
import { fill } from '../helpers/format';
import { CODE_URL, ENGINE_URL } from '../helpers/links';
import { useSettings } from '../helpers/settings';
import legal from '../i18n/legal';
import { LogoMark } from './icons';

function Footer() {
    const { t } = useSettings();
    const [engine, setEngine] = useState('');
    const [commit, setCommit] = useState('');

    // The version of the engine the server actually runs, and the commit of the site's code.
    useEffect(() => {
        getInfo().then((info) => {
            // A development build's version ends in +g<commit>; the part before is enough.
            setEngine((info.engine || '').split('+')[0]);
            setCommit(info.commit || '');
        }).catch(() => {});
    }, []);

    const columns = [
        {
            title: t.footer.site,
            links: [
                { to: '/convert', text: t.nav.converter },
                { to: '/library', text: t.nav.library },
                { to: '/contact', text: t.nav.contact },
            ],
        },
        {
            title: t.footer.legal,
            links: [
                { to: '/terms', text: legal.terms.title },
                { to: '/privacy', text: legal.privacy.title },
                { to: '/copyright', text: legal.copyright.title },
            ],
        },
        {
            title: t.footer.openSource,
            // Its links are longer, so on a phone it takes a row of its own.
            wide: true,
            links: [
                // The code exactly as it runs here, as the AGPL asks of a site.
                { href: commit ? `${CODE_URL}/tree/${commit}` : CODE_URL, text: t.footer.source, detail: commit.slice(0, 7) },
                { href: ENGINE_URL, text: 'PDF2EPUB', detail: engine },
                { href: `${CODE_URL}/blob/main/LICENSE`, text: t.footer.license, detail: 'AGPL-3.0' },
            ],
        },
    ];

    return (
        <footer className="bf-footer">
            <div className="container bf-footer-inner">
                <div className="row gy-4 gx-3 bf-footer-top">
                    <div className="col-12 col-lg-6">
                        <Link to="/" className="bf-brand d-inline-flex mb-3">
                            <span className="bf-brand-mark"><LogoMark size={ 18 } /></span>
                            Bookflow
                        </Link>
                        <p className="small mb-0 bf-footer-about">{ t.footer.about }</p>
                    </div>
                    { columns.map((column) => (
                        <nav className={ `${column.wide ? 'col-12' : 'col-6'} col-md-4 col-lg-2` } key={ column.title } aria-label={ column.title }>
                            <div className="bf-footer-heading mb-3">{ column.title }</div>
                            <ul className="list-unstyled small bf-footer-links mb-0">
                                { column.links.map((link) => (
                                    <li key={ link.text }>
                                        { link.to ? <Link to={ link.to }>{ link.text }</Link> : <a href={ link.href }>{ link.text }</a> }
                                        { link.detail && <span className="bf-footer-pill">{ link.detail }</span> }
                                    </li>
                                )) }
                            </ul>
                        </nav>
                    )) }
                </div>

                <div className="bf-footer-bottom small">
                    <span>{ fill(t.footer.copyright, { year: new Date().getFullYear() }) } · AGPL-3.0-or-later</span>
                    <span>{ t.footer.usesBefore }<a href={ ENGINE_URL }>PDF2EPUB</a>{ t.footer.usesAfter }</span>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
