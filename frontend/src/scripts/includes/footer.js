import { useEffect, useState } from 'react';
import { getInfo } from '../helpers/api';
import { fill } from '../helpers/format';
import { CODE_URL, ENGINE_URL } from '../helpers/links';
import { useSettings } from '../helpers/settings';

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

    return (
        <footer className="bf-footer">
            {/* One line from lg up; below that, the two parts stack with a gap between them. */}
            <div className="container d-flex flex-column flex-lg-row justify-content-lg-between align-items-center gap-2 gap-lg-3 py-4 small text-center text-lg-start">
                <span>
                    <span className="bf-display fw-bold fs-6 me-2">Bookflow</span>
                    { fill(t.footer.copyright, { year: new Date().getFullYear() }) }
                </span>
                <span>
                    { t.footer.poweredBy } <a href={ ENGINE_URL }>PDF2EPUB</a>
                    { engine && <span className="bf-version"> { engine }</span> }
                    <span className="mx-2">·</span>
                    {/* The code exactly as it runs here, as the AGPL asks of a site. */}
                    <a href={ commit ? `${CODE_URL}/tree/${commit}` : CODE_URL }>{ t.footer.source }</a>
                    { commit && <span className="bf-version"> { commit.slice(0, 7) }</span> }
                </span>
            </div>
        </footer>
    );
}

export default Footer;
