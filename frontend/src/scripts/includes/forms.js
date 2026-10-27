import { useState } from 'react';
import { Check } from './icons';
import { PageHeader } from './page';

// A form's fields as state: `set(name)` is a field's onChange; `reset()` empties them.
export function useFields(empty) {
    const [fields, setFields] = useState(empty);
    const set = (name) => (e) => setFields((old) => ({ ...old, [name]: e.target.value }));
    return [fields, set, () => setFields(empty)];
}

// A page with a form: its header, the form's card, and a panel beside it.
export function FormPage({ title, lead, side, children }) {
    return (
        <section className="container bf-section bf-fill bf-form-page">
            <PageHeader title={ title } lead={ lead } />
            <div className="row g-4">
                <div className="col-lg-7">{ children }</div>
                <div className="col-lg-5">{ side }</div>
            </div>
        </section>
    );
}

// A field's name, and "(optional)" after it when the field may be left empty. Without
// `htmlFor` it names a group of controls rather than one.
export function FieldLabel({ htmlFor, optional, children }) {
    const Tag = htmlFor ? 'label' : 'span';
    return (
        <Tag className="form-label fw-medium d-block" htmlFor={ htmlFor }>
            { children }
            { optional && <span className="bf-muted fw-normal"> { optional }</span> }
        </Tag>
    );
}

// A field people never see, so only bots fill it in (the server drops their posts).
export function Trap({ value, onChange }) {
    return (
        <div className="visually-hidden" aria-hidden="true">
            <input name="website" tabIndex={ -1 } autoComplete="off" value={ value } onChange={ onChange } />
        </div>
    );
}

// What a form becomes once it's sent: a thank-you, then what to do next.
export function Sent({ title, text, children }) {
    return (
        <div className="bf-panel bf-sent h-100 p-4 p-lg-5" role="status">
            <span className="bf-icon-tile mb-4"><Check size={ 24 } /></span>
            <h2 className="bf-display bf-card-title mb-2">{ title }</h2>
            <p className="bf-muted mb-4">{ text }</p>
            <div className="bf-cta">{ children }</div>
        </div>
    );
}
