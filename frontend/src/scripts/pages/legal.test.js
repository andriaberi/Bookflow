import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../app';
import { SettingsProvider } from '../helpers/settings';

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
    global.fetch = jest.fn((url) => {
        const reply = url === '/api/info' ? { engine: '1.2026.1028.1', commit: '00d1f87abcdef' } : [];
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(reply) });
    });
});

test('the footer links to the legal pages and to the code as it runs', async () => {
    await renderAt('/');
    const footer = within(screen.getByRole('contentinfo'));

    expect(footer.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    expect(footer.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    expect(footer.getByRole('link', { name: 'Copyright' })).toHaveAttribute('href', '/copyright');
    expect(footer.getByRole('link', { name: 'Source code' })).toHaveAttribute('href', 'https://github.com/andriaberi/Bookflow/tree/00d1f87abcdef');
    expect(footer.getByText('00d1f87')).toBeInTheDocument();
    expect(footer.getByText('1.2026.1028.1')).toBeInTheDocument();
    expect(footer.getByText(/Uses/)).toHaveTextContent('Uses PDF2EPUB by Andria Beridze');
});

test('a legal page has its sections, and links written in its text', async () => {
    await renderAt('/copyright');

    expect(document.title).toBe('Copyright · Bookflow');
    expect(screen.getByRole('heading', { name: 'If your work is here without permission' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'contact page' })).toHaveAttribute('href', '/contact?kind=copyright');
});

test('the legal pages stay in English on the Georgian site', async () => {
    localStorage.setItem('lang', 'ka');
    await renderAt('/privacy');

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { level: 1 })).toHaveTextContent('Privacy');
    expect(main.querySelector('[lang="en"]')).not.toBeNull();
    // The footer around it is still Georgian.
    expect(within(screen.getByRole('contentinfo')).getByText('სამართლებრივი')).toBeInTheDocument();
});
