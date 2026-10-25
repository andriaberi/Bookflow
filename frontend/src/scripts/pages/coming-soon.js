import { Link } from 'react-router-dom';
import { useSettings } from '../helpers/settings';

// Stands in for the converter, library and suggestion pages until each is built.
function ComingSoon({ page }) {
    const { t } = useSettings();

    return (
        <section className="container bf-section text-center bf-soon">
            <h1 className="bf-display bf-section-title mb-3">{ t.soon[page] }</h1>
            <p className="bf-muted fs-5 mb-4">{ t.soon.text }</p>
            <Link to="/" className="btn btn-ghost px-4">{ t.soon.home }</Link>
        </section>
    );
}

export default ComingSoon;
