import { headingText, joinBlocks, levelAt, pageRange, roleCounts, sectionOf, sectionsOf, splitBlock, styledRuns, toHeading, toText, withBlock, withBlocks } from './book';

const heading = (label, title = null) => ({ type: 'heading', label, title, role: 'body', include: true, page: 1 });
const text = (fields = {}) => ({ type: 'text', text: 'x', role: 'body', include: true, page: 1, ...fields });

test('sections start at each heading, after any blocks before the first', () => {
    const blocks = [text({ role: 'title-page' }), heading('I'), text(), text(), heading('II'), text()];
    expect(sectionsOf(blocks)).toEqual([
        { start: 0, end: 1 },
        { start: 1, end: 4 },
        { start: 4, end: 6 },
    ]);
});

test('a book that starts with a heading has no section before it', () => {
    expect(sectionsOf([heading('I'), text()])).toEqual([{ start: 0, end: 2 }]);
    expect(sectionsOf([])).toEqual([]);
});

test('a heading reads as its label and title', () => {
    expect(headingText(heading('თავი I'))).toBe('თავი I');
    expect(headingText(heading('Chapter 2', 'The Storm'))).toBe('Chapter 2: The Storm');
});

test('roles count their blocks and whether all are included', () => {
    const blocks = [text(), text({ role: 'back', include: false }), text({ role: 'back', include: false }), text({ role: 'preface' })];
    expect(roleCounts(blocks)).toEqual({
        back: { count: 2, included: false },
        preface: { count: 1, included: true },
    });
});

test('page range skips blocks with no known page', () => {
    expect(pageRange([text({ page: 0 }), text({ page: 7 }), text({ page: 3 })])).toEqual({ from: 3, to: 7 });
    expect(pageRange([text({ page: 0 })])).toBeNull();
});

test('changing a block leaves the old book as it was', () => {
    const book = { blocks: [text(), text()] };
    const changed = withBlock(book, 1, { include: false });
    expect(changed.blocks[1].include).toBe(false);
    expect(book.blocks[1].include).toBe(true);
    expect(changed.blocks[0]).toBe(book.blocks[0]);
});

test('a paragraph becomes a heading and back', () => {
    const block = text({ id: 'p1', text: 'Chapter Three' });
    const heading = toHeading(block, 2);
    expect(heading).toMatchObject({ type: 'heading', id: 'p1', level: 2, label: 'Chapter Three', title: null });
    expect(toText({ ...heading, title: 'Rain' })).toMatchObject({ type: 'text', id: 'p1', text: 'Chapter Three: Rain' });
});

test('a paragraph splits at the cursor, keeping each part\'s notes', () => {
    const block = text({ id: 'p1', text: 'One sentence.[1] Another one.[2]', notes: { 1: 'n1', 2: 'n2' } });
    const [first, second] = splitBlock(block, 17);
    expect(first).toMatchObject({ id: 'p1', text: 'One sentence.[1]', notes: { 1: 'n1' } });
    expect(second).toMatchObject({ text: 'Another one.[2]', notes: { 2: 'n2' } });
    expect(second.id).not.toBe('p1');
    expect(splitBlock(block, 0)).toBeNull();
});

test('verse splits between its lines', () => {
    const block = text({ verse: true, lines: ['Line one', 'Line two', 'Line three'], text: 'Line one Line two Line three' });
    const [first, second] = splitBlock(block, 'Line one\nLine'.length);
    expect(first.lines).toEqual(['Line one']);
    expect(second.lines).toEqual(['Line two', 'Line three']);
});

test('two paragraphs join into one', () => {
    const joined = joinBlocks(text({ id: 'a', text: 'Half a', notes: { 1: 'n1' } }), text({ id: 'b', text: 'sentence.', notes: { 2: 'n2' } }));
    expect(joined).toMatchObject({ id: 'a', text: 'Half a sentence.', notes: { 1: 'n1', 2: 'n2' } });
});

test('a new heading takes the level of the heading before it', () => {
    const blocks = [heading('I'), text(), { ...heading('1.1'), level: 2 }, text()];
    expect(levelAt(blocks, 3)).toBe(2);
    expect(levelAt(blocks, 0)).toBe(1);
});

test('blocks can be replaced in one go, and found by section', () => {
    const book = { blocks: [heading('I'), text({ id: 'a' }), text({ id: 'b' })] };
    const changed = withBlocks(book, 1, 3, [text({ id: 'ab' })]);
    expect(changed.blocks.map((block) => block.id)).toEqual([undefined, 'ab']);
    expect(sectionOf([{ start: 0, end: 2 }, { start: 2, end: 5 }], 3)).toBe(1);
});

test('italics and bold are runs of their own', () => {
    expect(styledRuns('a <i>very <b>good</b></i> day')).toEqual([
        { text: 'a ', italic: false, bold: false },
        { text: 'very ', italic: true, bold: false },
        { text: 'good', italic: true, bold: true },
        { text: ' day', italic: false, bold: false },
    ]);
});

test('a tag left open runs to the end, and a stray closing one is ignored', () => {
    expect(styledRuns('plain</b> <i>open')).toEqual([
        { text: 'plain', italic: false, bold: false },
        { text: ' ', italic: false, bold: false },
        { text: 'open', italic: true, bold: false },
    ]);
});

test('other markup stays text', () => {
    expect(styledRuns('<script>x</script>')).toEqual([{ text: '<script>x</script>', italic: false, bold: false }]);
});
