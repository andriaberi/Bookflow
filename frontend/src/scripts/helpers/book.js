// Working with pdf2epub's book data (Book.to_dict()): its blocks in reading order,
// each heading starting a section.

// The sections of the book: { start, end } ranges of block indexes, end excluded, each
// starting at a heading, plus the blocks before the first heading if there are any.
export function sectionsOf(blocks) {
    const sections = [];
    blocks.forEach((block, index) => {
        if (block.type === 'heading' || sections.length === 0) {
            sections.push({ start: index, end: index + 1 });
        } else {
            sections[sections.length - 1].end = index + 1;
        }
    });
    return sections;
}

// "თავი I", or "Chapter 2: The Storm" when the heading has a title.
export function headingText(block) {
    return block.title ? `${block.label}: ${block.title}` : block.label;
}

// The roles besides the body text (title page, colophon, …): how many blocks have each,
// and whether all of them are in the EPUB.
export function roleCounts(blocks) {
    const roles = {};
    for (const block of blocks) {
        if (block.role === 'body') continue;
        const role = roles[block.role] || (roles[block.role] = { count: 0, included: true });
        role.count += 1;
        role.included = role.included && block.include;
    }
    return roles;
}

// The first and last PDF page the blocks are printed on, or null if none is known.
export function pageRange(blocks) {
    const pages = blocks.map((block) => block.page).filter((page) => page > 0);
    return pages.length ? { from: Math.min(...pages), to: Math.max(...pages) } : null;
}

// The book with one block changed: blocks are replaced, never edited in place, so
// React sees the change.
export function withBlock(book, index, changes) {
    const blocks = book.blocks.slice();
    blocks[index] = { ...blocks[index], ...changes };
    return { ...book, blocks };
}

// Which section block `index` is in.
export function sectionOf(sections, index) {
    const found = sections.findIndex((section) => index >= section.start && index < section.end);
    return Math.max(found, 0);
}

// New blocks get ids no block of the book has: "new-<time>-<count>".
let made = 0;
export function newId() {
    made += 1;
    return `new-${Date.now().toString(36)}-${made}`;
}

// The level a new heading at `index` gets: the level of the heading before it, else 1.
export function levelAt(blocks, index) {
    const before = blocks.slice(0, index).reverse().find((block) => block.type === 'heading');
    return before ? before.level : 1;
}

// A paragraph made into a heading: its text becomes the label.
export function toHeading(block, level) {
    return {
        type: 'heading', id: block.id, page: block.page, role: block.role, include: block.include,
        level, label: block.text.trim() || '…', title: null,
    };
}

// A heading made into a paragraph: "label: title" becomes its text.
export function toText(block) {
    return {
        type: 'text', id: block.id, page: block.page, role: block.role, include: block.include,
        text: headingText(block), lines: [], verse: false, epigraph: false, attribution: false, notes: {},
    };
}

export function newHeading(page, level) {
    return { type: 'heading', id: newId(), page, role: 'body', include: true, level, label: '…', title: null };
}

// The note marks that appear in the text: "[12]".
function notesIn(notes, text) {
    return Object.fromEntries(Object.entries(notes || {}).filter(([mark]) => text.includes(`[${mark}]`)));
}

// A paragraph split in two at `at` (a character offset; for verse, the line `at` is on).
// Null if either part would be empty.
export function splitBlock(block, at) {
    let first;
    let second;
    if (block.verse && block.lines.length) {
        const line = block.lines.join('\n').slice(0, at).split('\n').length - 1;
        first = { lines: block.lines.slice(0, line) };
        second = { lines: block.lines.slice(line) };
        if (!first.lines.length || !second.lines.length) return null;
        first.text = first.lines.join(' ');
        second.text = second.lines.join(' ');
    } else {
        first = { text: block.text.slice(0, at).trim() };
        second = { text: block.text.slice(at).trim() };
        if (!first.text || !second.text) return null;
    }
    return [
        { ...block, ...first, notes: notesIn(block.notes, first.text) },
        { ...block, ...second, id: newId(), notes: notesIn(block.notes, second.text) },
    ];
}

// Two paragraphs joined into one; verse stays verse only if both are.
export function joinBlocks(block, next) {
    const verse = block.verse && next.verse;
    return {
        ...block,
        text: `${block.text} ${next.text}`,
        lines: verse ? [...block.lines, ...next.lines] : [],
        verse,
        notes: { ...block.notes, ...next.notes },
    };
}

// The book with the blocks from `start` to `end` (end excluded) replaced by `blocks`.
export function withBlocks(book, start, end, blocks) {
    return { ...book, blocks: [...book.blocks.slice(0, start), ...blocks, ...book.blocks.slice(end)] };
}
