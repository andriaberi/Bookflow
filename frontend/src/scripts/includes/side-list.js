// A panel beside a page's main card: a heading, then items, each with a mark, a name
// and a line of text.
function SideList({ title, items }) {
    return (
        <div className="bf-panel bf-looks h-100 p-4 p-lg-5">
            <div className="bf-eyebrow mb-4">{ title }</div>
            <ul className="list-unstyled d-flex flex-column gap-4 mb-0">
                { items.map((item) => (
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
    );
}

export default SideList;
