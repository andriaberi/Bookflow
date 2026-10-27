// A page that only says something: a title, then what's passed in (a line, a link).
function Message({ title, children }) {
    return (
        <section className="container bf-section bf-fill text-center bf-soon">
            <h1 className="bf-display bf-section-title bf-optical-top mb-3">{ title }</h1>
            { children }
        </section>
    );
}

export default Message;
