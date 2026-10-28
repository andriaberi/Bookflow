import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../app';
import { SettingsProvider } from '../helpers/settings';

// Everything goes out by XHR, so a PDF can report progress; this stands in for it.
let sent;
class FakeXhr {
    upload = {};
    open(method, url) {
        this.url = url;
    }
    setRequestHeader() {}
    send(form) {
        sent = { url: this.url, fields: Object.fromEntries(form.entries()) };
        this.status = FakeXhr.status;
        this.responseText = JSON.stringify(FakeXhr.reply);
        this.onload();
    }
}

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

const type = (label, value) => fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } });
const choose = (kind) => fireEvent.change(screen.getByLabelText('What’s it about?'), { target: { value: kind } });
const click = async (name) => act(async () => fireEvent.click(screen.getByRole('button', { name })));
const pdf = (name = 'book.pdf', size = 1000) => {
    const file = new File(['%PDF-'], name, { type: name.endsWith('.pdf') ? 'application/pdf' : 'text/plain' });
    Object.defineProperty(file, 'size', { value: size });
    return file;
};
const attach = (file) => fireEvent.change(screen.getByText('Attach the PDF').closest('label').querySelector('input'), { target: { files: [file] } });

beforeEach(() => {
    localStorage.clear();
    sent = null;
    FakeXhr.status = 201;
    FakeXhr.reply = {};
    global.XMLHttpRequest = FakeXhr;
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) }));
    document.cookie = 'csrftoken=test';
});

test('a message is sent, and the form can be used again', async () => {
    await renderAt('/contact');

    await click('Send message');
    expect(screen.getByRole('alert')).toHaveTextContent('Write a message first.');
    expect(sent).toBeNull();

    type('Name', 'Nino');
    type('Message', 'Love the library.');
    await click('Send message');

    expect(sent).toEqual({ url: '/api/contact/', fields: { kind: 'message', name: 'Nino', text: 'Love the library.' } });
    expect(screen.getByRole('status')).toHaveTextContent('Thank you. We have it.');
    await click('Write another');
    expect(screen.getByLabelText('Message')).toHaveValue('');
});

test('the server’s refusal is shown', async () => {
    FakeXhr.status = 400;
    FakeXhr.reply = { error: 'bad_email' };
    await renderAt('/contact');
    type('Message', 'Hi');
    await click('Send message');

    expect(screen.getByRole('alert')).toHaveTextContent('email address doesn’t look right');
});

test('each kind shows its own fields', async () => {
    await renderAt('/contact');
    expect(screen.queryByLabelText('Which page or book?', { exact: false })).toBeNull();
    expect(screen.queryByLabelText('Title')).toBeNull();

    choose('problem');
    expect(screen.getByLabelText('Which page or book?', { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText('What went wrong?')).toBeInTheDocument();

    choose('book');
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name', { exact: false })).toBeNull();
    expect(screen.getByText('What happens next')).toBeInTheDocument();

    choose('copyright');
    expect(screen.getByLabelText('Which book?')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();  // not optional here
});

test('a problem is sent with the page it’s about', async () => {
    await renderAt('/contact?kind=problem');
    type('Which page or book?', '/library/animal-farm');
    type('What went wrong?', 'Chapter 3 is missing.');
    await click('Send report');

    expect(sent.fields).toEqual({ kind: 'problem', link: '/library/animal-farm', text: 'Chapter 3 is missing.' });
});

test('a copyright concern needs the book and an email', async () => {
    await renderAt('/contact?kind=copyright');
    type('Tell us about it', 'I translated it.');
    await click('Send message');
    expect(screen.getByRole('alert')).toHaveTextContent('Say which book it is.');

    type('Which book?', 'Animal Farm');
    await click('Send message');
    expect(screen.getByRole('alert')).toHaveTextContent('Leave your email so we can answer.');
    expect(sent).toBeNull();

    type('Email', 'me@example.com');
    await click('Send message');
    expect(sent.fields).toEqual({ kind: 'copyright', email: 'me@example.com', link: 'Animal Farm', text: 'I translated it.' });
});

test('fields of another kind aren’t sent', async () => {
    await renderAt('/contact?kind=problem');
    type('Which page or book?', '/convert');
    choose('message');
    type('Message', 'Hello');
    await click('Send message');

    expect(sent.fields).toEqual({ kind: 'message', text: 'Hello' });
});

test('a book can be suggested by name', async () => {
    await renderAt('/contact?kind=book');
    await click('Send suggestion');
    expect(screen.getByRole('alert')).toHaveTextContent('Give the book’s title.');
    expect(sent).toBeNull();

    type('Title', 'Animal Farm');
    type('Author', 'George Orwell');
    type('Email', 'reader@example.com');
    await click('Send suggestion');

    expect(sent).toEqual({ url: '/api/contact/', fields: { kind: 'book', title: 'Animal Farm', author: 'George Orwell', email: 'reader@example.com', lang: 'en' } });
    expect(screen.getByRole('status')).toHaveTextContent('Thank you. We have it.');

    await click('Suggest another');
    expect(screen.getByLabelText('Title')).toHaveValue('');
});

test('a PDF needs an answer about its rights', async () => {
    await renderAt('/contact?kind=book');
    type('Title', 'My Book');
    attach(pdf());

    expect(screen.getByText('book.pdf')).toBeInTheDocument();
    await click('Send suggestion');
    expect(screen.getByRole('alert')).toHaveTextContent('Say whether the PDF may be shared.');
    fireEvent.click(screen.getByLabelText('Yes, the book is in the public domain'));
    await click('Send suggestion');

    expect(sent.fields).toMatchObject({ kind: 'book', title: 'My Book', rights: 'public_domain' });
    expect(sent.fields.pdf).toBeInstanceOf(File);
});

test('permission asks who holds the rights, and another answer drops it', async () => {
    await renderAt('/contact?kind=book');
    type('Title', 'My Book');
    attach(pdf());
    fireEvent.click(screen.getByLabelText('Yes, I hold the rights or have permission'));
    await click('Send suggestion');
    expect(screen.getByRole('alert')).toHaveTextContent('Say who holds the rights.');

    type('Who holds the rights?', 'Me');
    fireEvent.click(screen.getByLabelText('I’m not sure'));
    expect(screen.queryByLabelText('Who holds the rights?')).toBeNull();
    await click('Send suggestion');
    expect(sent.fields.holder).toBeUndefined();
});

test('files that aren’t PDFs, or are too big, are refused before sending', async () => {
    await renderAt('/contact?kind=book');
    attach(pdf('notes.txt'));
    expect(screen.getByRole('alert')).toHaveTextContent('isn’t a PDF');

    attach(pdf('huge.pdf', 200 * 1024 * 1024));
    expect(screen.getByRole('alert')).toHaveTextContent('too big');
    expect(screen.getByText('Attach the PDF')).toBeInTheDocument();
});

test('the old suggest page opens the contact page on a book', async () => {
    await renderAt('/suggest');

    expect(screen.getByLabelText('What’s it about?')).toHaveValue('book');
    expect(document.title).toBe('Contact · Bookflow');
});

test('the navbar and the home page lead to the contact page', async () => {
    await renderAt('/');

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: /Contact/ })).toHaveAttribute('href', '/contact');
    expect(within(nav).queryByRole('link', { name: /Suggest/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Get in touch' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'Suggest a book' })).toHaveAttribute('href', '/contact?kind=book');
});

test('beside the form are the other places to go', async () => {
    await renderAt('/contact');
    const main = within(screen.getByRole('main'));

    expect(main.getByRole('link', { name: 'Open an issue on GitHub' })).toHaveAttribute('href', 'https://github.com/andriaberi/Bookflow/issues/new');
    expect(main.getByRole('link', { name: 'Browse the library' })).toHaveAttribute('href', '/library');
    expect(main.getByRole('link', { name: 'Bookflow' })).toHaveAttribute('href', 'https://github.com/andriaberi/Bookflow');
    expect(main.getByRole('link', { name: 'PDF2EPUB' })).toHaveAttribute('href', 'https://github.com/andriaberi/PDF2EPUB');
});

test('the email address sits beside the send button, and the tab says Contact', async () => {
    await renderAt('/contact');

    expect(screen.getByRole('link', { name: 'andria24b@gmail.com' })).toHaveAttribute('href', 'mailto:andria24b@gmail.com');
    expect(document.title).toBe('Contact · Bookflow');
});
