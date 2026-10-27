import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../app';
import { SettingsProvider } from '../helpers/settings';

// The suggestion goes out by XHR, so it can report progress; this stands in for it.
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

async function renderSuggest() {
    await act(async () => {
        render(
            <SettingsProvider>
                <MemoryRouter initialEntries={ ['/suggest'] }>
                    <App />
                </MemoryRouter>
            </SettingsProvider>
        );
    });
}

const type = (label, value) => fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } });
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
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
    document.cookie = 'csrftoken=test';
});

test('a book can be suggested by name', async () => {
    await renderSuggest();
    const send = screen.getByRole('button', { name: 'Send suggestion' });
    fireEvent.click(send);
    expect(screen.getByRole('alert')).toHaveTextContent('Give the book’s title.');
    expect(sent).toBeNull();

    type('Title', 'Animal Farm');
    type('Author', 'George Orwell');
    type('Email', 'reader@example.com');
    await act(async () => fireEvent.click(send));

    expect(sent).toEqual({ url: '/api/library/suggestions', fields: { title: 'Animal Farm', author: 'George Orwell', email: 'reader@example.com' } });
    expect(screen.getByRole('status')).toHaveTextContent('Thank you. We have it.');

    fireEvent.click(screen.getByRole('button', { name: 'Suggest another' }));
    expect(screen.getByLabelText('Title')).toHaveValue('');
});

test('a PDF needs an answer about its rights', async () => {
    await renderSuggest();
    type('Title', 'My Book');
    attach(pdf());

    expect(screen.getByText('book.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send suggestion' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Say whether the PDF may be shared.');
    fireEvent.click(screen.getByLabelText('Yes, the book is in the public domain'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send suggestion' })));

    expect(sent.fields).toMatchObject({ title: 'My Book', rights: 'public_domain' });
    expect(sent.fields.pdf).toBeInstanceOf(File);
});

test('a removed PDF takes the rights question with it', async () => {
    await renderSuggest();
    attach(pdf());
    fireEvent.click(screen.getByRole('button', { name: 'Remove the PDF' }));

    expect(screen.queryByText('May this PDF be shared?')).toBeNull();
    expect(screen.getByText('Attach the PDF')).toBeInTheDocument();
});

test('files that aren’t PDFs, or are too big, are refused before sending', async () => {
    await renderSuggest();
    attach(pdf('notes.txt'));
    expect(screen.getByRole('alert')).toHaveTextContent('isn’t a PDF');

    attach(pdf('huge.pdf', 200 * 1024 * 1024));
    expect(screen.getByRole('alert')).toHaveTextContent('too big');
    expect(screen.getByText('Attach the PDF')).toBeInTheDocument();
});

test('the server’s refusal is shown in the page’s language', async () => {
    FakeXhr.status = 400;
    FakeXhr.reply = { error: 'bad_email' };
    await renderSuggest();
    type('Title', 'My Book');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send suggestion' })));

    expect(screen.getByRole('alert')).toHaveTextContent('email address doesn’t look right');
});
