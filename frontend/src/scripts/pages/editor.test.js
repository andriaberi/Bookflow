import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../app';
import { SettingsProvider } from '../helpers/settings';

const ID = '9f043ee9-e78b-46fc-ae57-b4bbd3825ad6';

const heading = (id, label, page) => ({ type: 'heading', id, label, title: null, level: 1, role: 'body', include: true, page });
const text = (id, body, page, fields = {}) => ({
    type: 'text', id, text: body, lines: [], verse: false, epigraph: false, attribution: false,
    notes: {}, role: 'body', include: true, page, ...fields,
});

const BOOK = {
    version: 1,
    metadata: { title: 'Pride and Prejudice', author: 'Jane Austen', language: 'en', identifier: 'urn:uuid:x' },
    blocks: [
        text('b1', 'PRIDE AND PREJUDICE', 1, { role: 'title-page', include: false }),
        heading('b2', 'Chapter I', 2),
        text('b3', 'It is a truth universally acknowledged.', 2),
        heading('b4', 'Chapter II', 5),
        text('b5', 'Mr. Bennet was among the earliest.', 5),
    ],
    notes: [],
    cover: null,
    cover_source: 'no cover',
    include_notes: true,
};

// The API: the book to edit, and saves answered with `problems`.
function mockApi(problems = [], book = BOOK) {
    const saves = [];
    global.fetch = jest.fn((url, options = {}) => {
        const path = String(url);
        const reply = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
        if (path === `/api/convert/${ID}/book` && options.method === 'PUT') {
            saves.push(JSON.parse(options.body));
            return reply({ problems });
        }
        if (path.includes('/epub-files/')) {
            const page = `<html><head><title>x</title></head><body>Page ${path.split('/').pop()}</body></html>`;
            return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(page) });
        }
        if (path.startsWith(`/api/convert/${ID}/preview?block=`)) {
            const block = decodeURIComponent(path.split('block=')[1]);
            return reply({ url: `/api/convert/${ID}/epub-files/EPUB/text/for-${block}.xhtml` });
        }
        if (path === `/api/convert/${ID}/cover` && options.method === 'POST') {
            return reply({ cover_url: '/media/conversions/x/cover.jpg?v=2' });
        }
        if (path === `/api/convert/${ID}/book`) {
            return reply({ book, name: 'pride', pages: 9, cover_url: null });
        }
        return reply({});
    });
    document.cookie = 'csrftoken=test';
    return saves;
}

async function renderEditor() {
    await act(async () => {
        render(
            <SettingsProvider>
                <MemoryRouter initialEntries={ [`/convert/${ID}/edit`] }>
                    <App />
                </MemoryRouter>
            </SettingsProvider>
        );
    });
}

beforeEach(() => localStorage.clear());

test('the editor opens on the first section with something in the EPUB', async () => {
    const saves = mockApi();
    await renderEditor();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chapter I');
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    expect(saves).toHaveLength(0);
});

test('the editor shows the book: details, contents and the first section', async () => {
    mockApi();
    await renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /Before the first chapter/ }));

    expect(screen.getByLabelText('Title')).toHaveValue('Pride and Prejudice');
    expect(screen.getByLabelText('Author')).toHaveValue('Jane Austen');
    const contents = within(screen.getByRole('main')).getByRole('list', { name: '' }).closest('section');
    expect(within(contents).getByText('Before the first chapter')).toBeInTheDocument();
    expect(within(contents).getByText('Chapter II')).toBeInTheDocument();
    expect(screen.getByText('PRIDE AND PREJUDICE')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Page 1 of the PDF/ })).toBeInTheDocument();
});

test('picking a chapter in the contents shows its paragraphs', async () => {
    mockApi();
    await renderEditor();

    fireEvent.click(screen.getByRole('button', { name: /Chapter II/ }));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chapter II');
    expect(screen.getByText('Mr. Bennet was among the earliest.')).toBeInTheDocument();
    expect(screen.queryByText('It is a truth universally acknowledged.')).toBeNull();
});

test('a change is saved after a moment', async () => {
    const saves = mockApi();
    await renderEditor();

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Pride & Prejudice' } });
    expect(screen.getByRole('status')).toHaveTextContent('Saving…');

    await waitFor(() => expect(saves).toHaveLength(1));
    expect(saves[0].metadata.title).toBe('Pride & Prejudice');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved'));
});

test('a picture shows, and is saved without its image', async () => {
    const picture = { type: 'picture', id: 'p1', page: 2, role: 'body', include: true, data: '/9ggcGljdHVyZQ==', width: 30, height: 20 };
    const blocks = [...BOOK.blocks.slice(0, 3), picture, ...BOOK.blocks.slice(3)];
    const saves = mockApi([], { ...BOOK, blocks });
    await renderEditor();

    const card = screen.getByAltText('Picture').closest('article');
    expect(screen.getByAltText('Picture')).toHaveAttribute('src', 'data:image/jpeg;base64,/9ggcGljdHVyZQ==');
    fireEvent.click(within(card).getByRole('switch'));

    await waitFor(() => expect(saves).toHaveLength(1));
    expect(saves[0].blocks[3]).toEqual({ ...picture, include: false, data: '' });
});

test('a paragraph shows its italics and bold', async () => {
    const blocks = BOOK.blocks.map((block) => (block.id === 'b3' ? { ...block, text: 'It is a <i>truth</i> <b>universally</b> acknowledged.' } : block));
    mockApi([], { ...BOOK, blocks });
    await renderEditor();

    expect(screen.getByText('truth').tagName).toBe('EM');
    expect(screen.getByText('universally').tagName).toBe('STRONG');
    expect(screen.queryByText(/<i>/)).toBeNull();
});

test('turning on the title page includes it in the EPUB', async () => {
    const saves = mockApi();
    await renderEditor();

    fireEvent.click(screen.getByRole('switch', { name: 'Title page' }));

    await waitFor(() => expect(saves).toHaveLength(1));
    expect(saves[0].blocks[0].include).toBe(true);
});

test('problems keep the EPUB from being downloaded', async () => {
    mockApi(['no block is included, so there is nothing to write']);
    await renderEditor();

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'x' } });

    expect(await screen.findByText('no block is included, so there is nothing to write')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download EPUB' })).toBeDisabled();
});

test('leave out all leaves out the whole section at once', async () => {
    const saves = mockApi();
    await renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Leave out all' }));

    await waitFor(() => expect(saves).toHaveLength(1));
    expect(saves[0].blocks.slice(1, 3).map((block) => block.include)).toEqual([false, false]);
    expect(saves[0].blocks[3].include).toBe(true);
});

test('select mode leaves out only the ticked paragraphs', async () => {
    const saves = mockApi();
    await renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    fireEvent.click(screen.getByText('It is a truth universally acknowledged.'));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Leave out' }));

    await waitFor(() => expect(saves).toHaveLength(1));
    expect(saves[0].blocks[1].include).toBe(true);
    expect(saves[0].blocks[2].include).toBe(false);
});

test('a paragraph can be made a heading, which starts a new section', async () => {
    const saves = mockApi();
    await renderEditor();

    fireEvent.click(screen.getByText('It is a truth universally acknowledged.'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Type' }), { target: { value: '2' } });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('It is a truth universally acknowledged.');
    await waitFor(() => expect(saves).toHaveLength(1));
    expect(saves[0].blocks[2]).toMatchObject({ type: 'heading', level: 2, label: 'It is a truth universally acknowledged.' });
});

test('a paragraph splits at the cursor', async () => {
    const saves = mockApi();
    await renderEditor();

    fireEvent.click(screen.getByText('It is a truth universally acknowledged.'));
    const textarea = screen.getByRole('textbox', { name: 'Paragraph text' });
    textarea.setSelectionRange(14, 14);
    fireEvent.click(screen.getByRole('button', { name: 'Split at cursor' }));

    await waitFor(() => expect(saves).toHaveLength(1));
    expect(saves[0].blocks[2].text).toBe('It is a truth');
    expect(saves[0].blocks[3].text).toBe('universally acknowledged.');
});

test('the cover can be replaced', async () => {
    mockApi();
    await renderEditor();

    const input = screen.getByText('Replace').querySelector('input');
    await act(async () => fireEvent.change(input, { target: { files: [new File(['x'], 'c.png', { type: 'image/png' })] } }));

    expect(screen.getByRole('img', { name: 'Cover' })).toHaveAttribute('src', '/media/conversions/x/cover.jpg?v=2');
});

test('the EPUB tab shows the section as the EPUB writes it', async () => {
    mockApi();
    await renderEditor();

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'EPUB' })));
    const frame = () => screen.getByTitle('This section as the EPUB shows it').getAttribute('srcdoc');
    expect(frame()).toContain('Page for-b2.xhtml');
    // Its stylesheet and fonts load from the same place in the EPUB.
    expect(frame()).toContain(`<head><base href="/api/convert/${ID}/epub-files/EPUB/text/">`);

    await act(async () => fireEvent.click(screen.getByText('It is a truth universally acknowledged.')));
    expect(frame()).toContain('Page for-b3.xhtml');
});

test('an open editor keeps its book, and leaving lets it go', async () => {
    mockApi();
    navigator.sendBeacon = jest.fn();
    await renderEditor();

    expect(global.fetch).toHaveBeenCalledWith(`/api/convert/${ID}/seen`, expect.objectContaining({ method: 'POST' }));
    expect(screen.getByText(/Leaving deletes this book/)).toBeInTheDocument();

    window.dispatchEvent(new Event('pagehide'));
    expect(navigator.sendBeacon).toHaveBeenCalledWith(`/api/convert/${ID}/left`, expect.any(FormData));
    expect(navigator.sendBeacon.mock.calls[0][1].get('csrfmiddlewaretoken')).toBe('test');
});

test('a deleted book says so', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('no json')) }));
    await renderEditor();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This book has been deleted.');
    expect(screen.getByRole('link', { name: 'Try another PDF' })).toHaveAttribute('href', '/convert');
});
