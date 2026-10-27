import { Check } from './icons';

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
