import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadPdf } from '../helpers/api';
import { fill } from '../helpers/format';
import { useSettings } from '../helpers/settings';
import { FileUp } from '../includes/icons';

// The same limit the server checks (MAX_PDF_SIZE_MB); checked here too, so a big file
// is refused before it's uploaded.
const MAX_MB = 100;

function isPdf(file) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function Convert() {
    const { t } = useSettings();
    const navigate = useNavigate();
    const input = useRef(null);
    const [over, setOver] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState('');

    const uploading = progress !== null;

    async function upload(file) {
        if (!file || uploading) return;
        setError('');
        if (!isPdf(file)) return setError('not_pdf');
        if (file.size > MAX_MB * 1024 * 1024) return setError('too_big');

        setProgress(0);
        try {
            const conversion = await uploadPdf(file, setProgress);
            navigate(`/convert/${conversion.id}`);
        } catch (e) {
            setProgress(null);
            setError(e.code in t.convert.errors ? e.code : 'server');
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
            <header className="bf-center-stacked bf-convert-header">
                <h1 className="bf-display bf-page-title bf-optical-top mb-3">{ t.convert.title }</h1>
                <p className="fs-5 bf-muted bf-page-lead mb-0">{ t.convert.lead }</p>
            </header>

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
                                <span className="bf-chip">{ fill(t.convert.limit, { mb: MAX_MB }) }</span>
                            </>
                        ) }
                        <input
                            ref={ input }
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

                    { error && (
                        <div className="bf-alert mt-3" role="alert">
                            { fill(t.convert.errors[error], { mb: MAX_MB }) }
                        </div>
                    ) }
                </div>

                <div className="col-lg-5">
                    <div className="bf-panel bf-looks h-100 p-4 p-lg-5">
                        <div className="bf-eyebrow mb-4">{ t.convert.looksFor }</div>
                        <ul className="list-unstyled d-flex flex-column gap-4 mb-0">
                            { t.convert.items.map((item) => (
                                <li className="d-flex gap-3" key={ item.name }>
                                    <span className="bf-display bf-looks-mark" aria-hidden="true">{ item.mark }</span>
                                    <div>
                                        <div className="fw-semibold mb-1">{ item.name }</div>
                                        <div className="small bf-muted bf-looks-text">{ item.text }</div>
                                    </div>
                                </li>
                            )) }
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Convert;
