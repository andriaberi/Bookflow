import { Link } from 'react-router-dom';
import { useSettings } from '../helpers/settings';
import Message from '../includes/message';

// Stands in for the converter, library and suggestion pages until each is built.
function ComingSoon({ page }) {
    const { t } = useSettings();

    return (
        <Message title={ t.soon[page] }>
            <p className="bf-muted fs-5 mb-4">{ t.soon.text }</p>
            <Link to="/" className="btn btn-ghost px-4">{ t.soon.home }</Link>
        </Message>
    );
}

export default ComingSoon;
