import { Link } from 'react-router-dom';
import legal from '../i18n/legal';
import { PageHeader, usePageTitle } from '../includes/page';

// A link written in the text as [text](/path), or [text](https://...) for another site.
const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

function withLinks(text) {
    const parts = [];
    let last = 0;
    for (const match of text.matchAll(LINK)) {
        parts.push(text.slice(last, match.index));
        const [, label, to] = match;
        parts.push(to.startsWith('/') ? <Link key={ match.index } to={ to }>{ label }</Link> : <a key={ match.index } href={ to }>{ label }</a>);
        last = match.index + match[0].length;
    }
    parts.push(text.slice(last));
    return parts;
}

// Terms, privacy or copyright: its sections, in English on either language's site.
function Legal({ page }) {
    const { title, lead, sections } = legal[page];
    usePageTitle(title);

    return (
        <section className="container bf-section bf-fill" lang="en">
            <PageHeader title={ title } lead={ lead } />
            <article className="bf-panel bf-legal p-4 p-lg-5">
                <p className="bf-muted small mb-4">{ legal.updated }</p>
                { sections.map((section) => (
                    <section key={ section.heading } className="mb-4">
                        <h2 className="bf-display h5 mb-2">{ section.heading }</h2>
                        { section.text.map((text) => <p key={ text } className="mb-2">{ withLinks(text) }</p>) }
                    </section>
                )) }
            </article>
        </section>
    );
}

export default Legal;
