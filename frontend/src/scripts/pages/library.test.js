import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../app';
import { SettingsProvider } from '../helpers/settings';

const book = (title, author, language, added, fields = {}) => ({
    title, id: `id-${added}`, author, language, description: '', added,
    cover_url: null, epub_url: `/media/${title}.epub`, epub_size: 1572864, chapters: null, ...fields,
});

const BOOKS = [
    book('Anna Karenina', 'Leo Tolstoy', 'en', '2026-10-01T00:00:00', { chapters: 246 }),
    book('ბუდენბროკები', 'თომას მანი', 'ka', '2026-10-20T00:00:00', { description: 'A family saga.' }),
    book('War and Peace', 'Leo Tolstoy', 'en', '2026-10-10T00:00:00'),
];

async function renderAt(path, reply) {
    global.fetch = jest.fn(reply);
    await act(async () => {
        render(
            <SettingsProvider>
                <MemoryRouter initialEntries={ [path] }>
                    <App />
                </MemoryRouter>
            </SettingsProvider>
        );
    });
}

const json = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

function api(url) {
    if (url === '/api/library/') return json(BOOKS);
    const found = BOOKS.find((b) => url === `/api/library/${b.id}`);
    return found ? json(found) : json({}, 404);
}

const gridTitles = () => within(screen.getAllByRole('list').at(-1)).getAllByRole('link').map((link) => link.querySelector('.bf-book-card-title').textContent);

beforeEach(() => localStorage.clear());

test('the library shows the newest book first, then every book', async () => {
    await renderAt('/library', api);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('ბუდენბროკები');
    expect(screen.getByText('A family saga.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download EPUB' })).toHaveAttribute('href', '/media/ბუდენბროკები.epub');
    expect(gridTitles()).toEqual(['ბუდენბროკები', 'War and Peace', 'Anna Karenina']);
    expect(screen.getByText('3 books')).toBeInTheDocument();
});

test('books can be searched, filtered by language and sorted', async () => {
    await renderAt('/library', api);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'tolstoy' } });
    expect(gridTitles()).toEqual(['War and Peace', 'Anna Karenina']);
    expect(screen.queryByText('New in the library')).toBeNull();

    fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), { target: { value: 'title' } });
    expect(gridTitles()).toEqual(['Anna Karenina', 'War and Peace']);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Georgian' }));
    expect(gridTitles()).toEqual(['ბუდენბროკები']);
    expect(screen.getByText('1 book')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nothing like it' } });
    expect(screen.getByText(/No books match/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(gridTitles()).toHaveLength(3);
});

test('a book has its own page with its details and other books', async () => {
    await renderAt(`/library/${BOOKS[0].id}`, api);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Anna Karenina');
    expect(screen.getByText('246')).toBeInTheDocument();
    expect(screen.getByText('1.5 MB')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download EPUB' })).toHaveAttribute('href', '/media/Anna Karenina.epub');
    expect(gridTitles()).toEqual(['ბუდენბროკები', 'War and Peace']);
});

test('an unknown book says so', async () => {
    await renderAt('/library/nope', api);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This book isn’t in the library.');
});

test('an empty library asks for suggestions', async () => {
    await renderAt('/library', () => json([]));
    expect(screen.getByText(/no books here yet/)).toBeInTheDocument();
});

test('a library that can’t be loaded says so', async () => {
    await renderAt('/library', () => json({}, 500));
    expect(screen.getByRole('alert')).toHaveTextContent('couldn’t be loaded');
});
