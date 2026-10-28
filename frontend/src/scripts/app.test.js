import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './app';
import { SettingsProvider } from './helpers/settings';

// Waits for the page's own requests (the home page loads library covers) to settle.
async function renderAt(path) {
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

beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
});

test('home page shows the hero and links to the converter', async () => {
    await renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('PDFs that read like books');
    expect(screen.getByRole('link', { name: /Convert a PDF/ })).toHaveAttribute('href', '/convert');
});

// The server, counting `converted` books.
const converting = (converted) => jest.fn((url) => Promise.resolve({ ok: true, json: () => Promise.resolve(url === '/api/info' ? { converted } : []) }));

test('the home page says how many books have been converted, once there are any', async () => {
    global.fetch = converting(1234);
    await renderAt('/');
    expect(screen.getByText('1,234').closest('p')).toHaveTextContent('1,234 books converted so far');
});

test('nothing is said about converted books before the first', async () => {
    global.fetch = converting(0);
    await renderAt('/');
    expect(screen.queryByText(/converted so far/)).toBeNull();
});

test('the language switch translates the page and is remembered', async () => {
    await renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'ქა' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('PDF, რომელიც წიგნივით იკითხება');
    expect(document.documentElement.lang).toBe('ka');
    expect(localStorage.getItem('lang')).toBe('ka');
});

test('the example book follows the page language', async () => {
    await renderAt('/');
    expect(screen.getAllByText('Chapter I').length).toBeGreaterThan(0);
    expect(screen.queryByText('თავი I')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'ქა' }));
    expect(screen.getAllByText('თავი I').length).toBeGreaterThan(0);
    expect(screen.queryByText('Chapter I')).toBeNull();
});

test('the theme button switches between light and dark', async () => {
    await renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
});

test('the phone menu disables the page behind it until it closes', async () => {
    await renderAt('/');
    const main = document.querySelector('.bf-main');

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const menu = screen.getByRole('dialog', { name: 'Menu' });
    expect(menu).toHaveTextContent('Converter');
    expect(main.inert).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(main.inert).toBe(false);
    expect(document.body.style.overflow).toBe('');
});

test('picking a page in the phone menu goes there and closes the menu', async () => {
    await renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const menu = screen.getByRole('dialog', { name: 'Menu' });
    await act(async () => fireEvent.click(within(menu).getByRole('link', { name: /Library/ })));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Library');
});

test('an unknown address shows the not-found page', async () => {
    await renderAt('/nowhere');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page not found');
});
