import { useSettings } from '../helpers/settings';

function Footer() {
    const { t } = useSettings();

    return (
        <footer className="bf-footer">
            <div className="container d-flex flex-wrap justify-content-center justify-content-lg-between align-items-center gap-2 gap-lg-3 py-4 small text-center text-lg-start">
                <span className="bf-display fw-bold fs-6">Bookflow</span>
                <span>
                    { t.footer.poweredBy } <a href="https://github.com/andriaberi/PDF2EPUB">PDF2EPUB</a> · { t.footer.madeBy }
                </span>
            </div>
        </footer>
    );
}

export default Footer;
