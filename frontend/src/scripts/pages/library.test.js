import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../app';
import { SettingsProvider } from '../helpers/settings';

const BOOKS = [
    { title: 'საბრალონი', slug: 'საბრალონი', author: 'ვიქტორ ჰიუგო', language: 'ka', description: '', cover_url: '/media/c.jpg', epub_url: '/media/s.epub' },
    { title: 'The Stranger', slug: 'the-stranger', author: '', language: 'en', description: 'A novel.', cover_url: null, epub_url: '/media/t.epub' },
];

async function renderLibrary(reply) {
    global.fetch = jest.fn(reply);
    await act(async () => {
        render(
            <SettingsProvider>
                <MemoryRouter initialEntries={ ['/library'] }>
                    <App />
                </MemoryRouter>
            </SettingsProvider>
        );
    });
}

const books = (list) => () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(list) });

beforeEach(() => localStorage.clear());

test('the library lists its books, each with a download', async () => {
    await renderLibrary(books(BOOKS));

    expect(screen.getByRole('heading', { level: 2, name: 'საბრალონი' })).toBeInTheDocument();
    expect(screen.getByText('ვიქტორ ჰიუგო')).toBeInTheDocument();
    expect(screen.getByText('A novel.')).toBeInTheDocument();
    const downloads = screen.getAllByRole('link', { name: 'Download EPUB' });
    expect(downloads.map((link) => link.getAttribute('href'))).toEqual(['/media/s.epub', '/media/t.epub']);
});

test('an empty library asks for suggestions', async () => {
    await renderLibrary(books([]));

    expect(screen.getByText(/no books here yet/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Suggest a book' }).some((link) => link.getAttribute('href') === '/suggest')).toBe(true);
});

test('a library that can’t be loaded says so', async () => {
    await renderLibrary(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }));

    expect(screen.getByRole('alert')).toHaveTextContent('couldn’t be loaded');
});
