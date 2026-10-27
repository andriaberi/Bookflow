import { Link } from 'react-router-dom';
import { useSettings } from '../helpers/settings';
import { usePageTitle } from '../includes/page';

function NotFound() {
    const { t } = useSettings();
    usePageTitle(t.notFound.title);

    return (
        <section className="container bf-section bf-fill text-center bf-message">
            <div className="bf-display bf-accent-text bf-optical-top fw-bold mb-2" style={ { fontSize: 72 } }>404</div>
            <h1 className="bf-display bf-section-title mb-3">{ t.notFound.title }</h1>
            <p className="bf-muted fs-5 mb-4">{ t.notFound.text }</p>
            <Link to="/" className="btn btn-ghost px-4">{ t.notFound.home }</Link>
        </section>
    );
}

export default NotFound;
