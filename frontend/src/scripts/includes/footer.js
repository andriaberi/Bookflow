import { useEffect, useState } from 'react';
import { getInfo } from '../helpers/api';
import { fill } from '../helpers/format';
import { ENGINE_URL } from '../helpers/links';
import { useSettings } from '../helpers/settings';

function Footer() {
    const { t } = useSettings();
    const [engine, setEngine] = useState('');

    // The version of the engine the server actually runs.
    useEffect(() => {
        // A development build's version ends in +g<commit>; the part before is enough.
        getInfo().then((info) => setEngine((info.engine || '').split('+')[0])).catch(() => {});
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
                </span>
            </div>
        </footer>
    );
}

export default Footer;
