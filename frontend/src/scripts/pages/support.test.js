import { act, fireEvent, render, screen, within } from '@testing-library/react';
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
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
});

test('the support page lists the ways to help', async () => {
    await renderAt('/support');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Help keep Bookflow free.');
    expect(screen.getByRole('link', { name: 'Open on GitHub' })).toHaveAttribute('href', 'https://github.com/andriaberi/PDF2EPUB');
    expect(screen.getByRole('link', { name: 'Open an issue' })).toHaveAttribute('href', 'https://github.com/andriaberi/Bookflow/issues/new');
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Suggest a book' })).toHaveAttribute('href', '/suggest');
    // No donation page is set yet, so there's no card for it.
    expect(screen.queryByRole('link', { name: 'Donate to Bookflow' })).toBeNull();
});

test('sharing copies the link where there is no share sheet', async () => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn(() => Promise.resolve()) } });
    await renderAt('/support');

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Share Bookflow' })));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.origin);
    expect(screen.getByRole('button', { name: 'Link copied' })).toBeInTheDocument();
});

test('the navbar and the home page lead to the support page', async () => {
    await renderAt('/');

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: /Support/ })).toHaveAttribute('href', '/support');
    expect(screen.getByRole('link', { name: 'Support Bookflow' })).toHaveAttribute('href', '/support');
});
