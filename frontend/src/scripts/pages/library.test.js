import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../app';
import { SettingsProvider } from '../helpers/settings';

const book = (id, title, author, language, fields = {}) => ({
    id, title, author, language, description: '',
    cover_url: null, epub_url: `/media/${title}.epub`, epub_size: 1572864, chapters: null, ...fields,
});

const BOOKS = [
    book('b1', 'War and Peace', 'Leo Tolstoy', 'en', { chapters: 246 }),
    book('b2', 'ბუდენბროკები', 'თომას მანი', 'ka', { description: 'A family saga.' }),
    book('b3', 'Anna Karenina', 'Leo Tolstoy', 'en'),
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

const gridTitles = () => within(within(screen.getByRole('main')).getAllByRole('list').at(-1)).getAllByRole('link').map((link) => link.querySelector('.bf-book-card-title').textContent);

beforeEach(() => localStorage.clear());

test('the library shows every book by title', async () => {
    await renderAt('/library', api);

    expect(gridTitles()).toEqual(['Anna Karenina', 'War and Peace', 'ბუდენბროკები']);
    expect(screen.getByText('3 books')).toBeInTheDocument();
});

test('a book picked at random is shown large, until a search', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    await renderAt('/library', api);

    expect(screen.getByText('Something to read')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('ბუდენბროკები');
    expect(screen.getByText('A family saga.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download EPUB' })).toHaveAttribute('href', '/media/ბუდენბროკები.epub');

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'tolstoy' } });
    expect(screen.queryByText('Something to read')).toBeNull();
    Math.random.mockRestore();
});

test('books can be searched, filtered by language and sorted', async () => {
    await renderAt('/library', api);

    fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), { target: { value: 'author' } });
    expect(gridTitles()).toEqual(['Anna Karenina', 'War and Peace', 'ბუდენბროკები']);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'tolstoy' } });
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

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('War and Peace');
    expect(screen.getByText('246')).toBeInTheDocument();
    expect(screen.getByText('1.5 MB')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download EPUB' })).toHaveAttribute('href', '/media/War and Peace.epub');
    expect(gridTitles()).toEqual(['ბუდენბროკები', 'Anna Karenina']);
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
