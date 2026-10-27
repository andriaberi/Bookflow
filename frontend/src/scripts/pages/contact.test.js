import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../app';
import { SettingsProvider } from '../helpers/settings';

let posted;

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

function mockApi(status = 201, reply = {}) {
    posted = null;
    global.fetch = jest.fn((url, options = {}) => {
        if (url === '/api/contact/') posted = Object.fromEntries(options.body.entries());
        return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(reply) });
    });
    document.cookie = 'csrftoken=test';
}

const type = (label, value) => fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } });

beforeEach(() => localStorage.clear());

test('a message is sent, and the form can be used again', async () => {
    mockApi();
    await renderAt('/contact');

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Write a message first.');
    expect(posted).toBeNull();

    type('Name', 'Nino');
    type('Message', 'Love the library.');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send message' })));

    expect(posted).toEqual({ name: 'Nino', text: 'Love the library.' });
    expect(screen.getByRole('status')).toHaveTextContent('Thank you. We have it.');
    fireEvent.click(screen.getByRole('button', { name: 'Write another' }));
    expect(screen.getByLabelText('Message')).toHaveValue('');
});

test('the server’s refusal is shown', async () => {
    mockApi(400, { error: 'bad_email' });
    await renderAt('/contact');
    type('Message', 'Hi');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send message' })));

    expect(screen.getByRole('alert')).toHaveTextContent('email address doesn’t look right');
});

test('the navbar and the home page lead to the contact page', async () => {
    mockApi(200, []);
    await renderAt('/');

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: /Contact/ })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'Get in touch' })).toHaveAttribute('href', '/contact');
});

test('beside the form are the other places to go', async () => {
    mockApi();
    await renderAt('/contact');
    const main = within(screen.getByRole('main'));

    expect(main.getByRole('link', { name: 'Open an issue on GitHub' })).toHaveAttribute('href', 'https://github.com/andriaberi/Bookflow/issues/new');
    expect(main.getByRole('link', { name: 'Suggest it' })).toHaveAttribute('href', '/suggest');
    expect(main.getByRole('link', { name: 'Browse the library' })).toHaveAttribute('href', '/library');
    expect(main.getByRole('link', { name: 'Bookflow' })).toHaveAttribute('href', 'https://github.com/andriaberi/Bookflow');
    expect(main.getByRole('link', { name: 'PDF2EPUB' })).toHaveAttribute('href', 'https://github.com/andriaberi/PDF2EPUB');
});
