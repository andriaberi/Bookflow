import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorCode, uploadPdf } from '../helpers/api';
import { fill } from '../helpers/format';
import { MAX_PDF_MB, MAX_PDF_PAGES, pdfProblem } from '../helpers/files';
import { useSettings } from '../helpers/settings';
import { FileUp } from '../includes/icons';
import { PageHeader, usePageTitle } from '../includes/page';
import SideList from '../includes/side-list';

function Convert() {
    const { t } = useSettings();
    usePageTitle(t.nav.converter);
    const navigate = useNavigate();
    const [over, setOver] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState('');

    const uploading = progress !== null;

    async function upload(file) {
        if (!file || uploading) return;
        setError('');
        const problem = pdfProblem(file);
        if (problem) return setError(problem);

        setProgress(0);
        try {
            const conversion = await uploadPdf(file, setProgress);
            navigate(`/convert/${conversion.id}`);
        } catch (e) {
            setProgress(null);
            setError(errorCode(e, t.convert.errors));
        }
    }

    function onDrop(event) {
        event.preventDefault();
        setOver(false);
        upload(event.dataTransfer.files[0]);
    }

    const percent = Math.round((progress || 0) * 100);

    return (
        <section className="container bf-section bf-fill bf-convert">
            <PageHeader title={ t.convert.title } lead={ t.convert.lead } />

            {/* The drop zone and the card share a row: same top, same bottom. */}
            <div className="row g-4">
                <div className="col-lg-7 d-flex flex-column">
                    <label
                        htmlFor="bf-pdf"
                        className={ `bf-drop ${over ? 'over' : ''} ${uploading ? 'busy' : ''}` }
                        onDragOver={ (event) => { event.preventDefault(); setOver(true); } }
                        onDragLeave={ () => setOver(false) }
                        onDrop={ onDrop }
                    >
                        <span className="bf-drop-icon"><FileUp size={ 36 } /></span>
                        { uploading ? (
                            <>
                                <span className="bf-display bf-drop-title">{ fill(t.convert.uploading, { percent }) }</span>
                                <span className="bf-drop-bar" role="progressbar" aria-valuenow={ percent } aria-valuemin="0" aria-valuemax="100">
                                    <span style={ { width: `${percent}%` } } />
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="bf-display bf-drop-title">{ over ? t.convert.dropping : t.convert.drop }</span>
                                <span className="bf-muted">
                                    { t.convert.or } <span className="bf-drop-browse">{ t.convert.browse }</span>
                                </span>
                                <span className="bf-chip">{ fill(t.convert.limit, { mb: MAX_PDF_MB }) }</span>
                            </>
                        ) }
                        <input
                            id="bf-pdf"
                            type="file"
                            accept="application/pdf,.pdf"
                            className="visually-hidden"
                            disabled={ uploading }
                            onChange={ (event) => {
                                upload(event.target.files[0]);
                                event.target.value = '';
                            } }
                        />
                    </label>

                    <p className="small bf-muted text-center mt-3 mb-0">{ t.convert.privacy }</p>
                    { error && (
                        <div className="bf-alert mt-3" role="alert">
                            { fill(t.convert.errors[error], { mb: MAX_PDF_MB, pages: MAX_PDF_PAGES }) }
                        </div>
                    ) }
                </div>

                <div className="col-lg-5">
                    <SideList title={ t.convert.looksFor } items={ t.convert.items } />
                </div>
            </div>
        </section>
    );
}

export default Convert;
