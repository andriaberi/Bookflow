import { useEffect } from 'react';

// The browser tab says which page this is: "Library · Bookflow".
export function usePageTitle(title) {
    useEffect(() => {
        document.title = title ? `${title} · Bookflow` : 'Bookflow';
    }, [title]);
}

// A page's title and lead; anything passed in sits beside them (the library's search).
export function PageHeader({ title, lead, children }) {
    return (
        <header className="bf-page-header">
            <div className="bf-center-stacked">
                <h1 className="bf-display bf-page-title bf-optical-top mb-3">{ title }</h1>
                <p className="fs-5 bf-muted bf-page-lead mb-0">{ lead }</p>
            </div>
            { children }
        </header>
    );
}
