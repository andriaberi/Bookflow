import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../app';
import { DONATE } from '../helpers/links';
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
    DONATE.paypal = '';
    DONATE.zelle = '';
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    Object.assign(navigator, { clipboard: { writeText: jest.fn(() => Promise.resolve()) } });
});

test('each way to donate shows once it is set', async () => {
    DONATE.paypal = 'https://paypal.me/someone';
    DONATE.zelle = 'someone@example.com';
    await renderAt('/support');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Help keep Bookflow free.');
    expect(screen.getByRole('link', { name: 'Donate with PayPal' })).toHaveAttribute('href', 'https://paypal.me/someone');
    expect(screen.getByText('someone@example.com')).toBeInTheDocument();

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy' })));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('someone@example.com');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
});

test('with nothing set, donations are coming soon', async () => {
    await renderAt('/support');

    expect(screen.getByText('Ways to donate are coming soon.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Donate with PayPal' })).toBeNull();
});

test('the other ways to help are one line of links', async () => {
    await renderAt('/support');
    const main = within(screen.getByRole('main'));

    expect(main.getByRole('link', { name: 'Star on GitHub' })).toHaveAttribute('href', 'https://github.com/andriaberi/PDF2EPUB');
    expect(main.getByRole('link', { name: 'Suggest a book' })).toHaveAttribute('href', '/suggest');
    expect(main.getByRole('link', { name: 'Report a problem' })).toHaveAttribute('href', 'https://github.com/andriaberi/Bookflow/issues/new');

    await act(async () => fireEvent.click(main.getByRole('button', { name: 'Share Bookflow' })));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.origin);
    expect(main.getByRole('button', { name: 'Link copied' })).toBeInTheDocument();
});

test('the navbar and the home page lead to the support page', async () => {
    await renderAt('/');

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: /Support/ })).toHaveAttribute('href', '/support');
    expect(screen.getByRole('link', { name: 'Support Bookflow' })).toHaveAttribute('href', '/support');
});
