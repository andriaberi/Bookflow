import { act, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../app';
import { SettingsProvider } from '../helpers/settings';

const ID = '9f043ee9-e78b-46fc-ae57-b4bbd3825ad6';

function conversion(fields) {
    return {
        id: ID, name: 'Pride and Prejudice', size: 524288, pages: 65,
        status: 'reading', step: 0, steps: 3, error: '', cover_url: null, book: null,
        ...fields,
    };
}

const BOOK = { title: 'Pride and Prejudice', author: 'Jane Austen', language: 'en', headings: 61, paragraphs: 2040, notes: 0 };

// Answers each API call from `routes` (path → list of responses, the last one repeated).
function mockApi(routes) {
    const calls = {};
    global.fetch = jest.fn((url) => {
        const path = String(url);
        const answers = routes[path] || [{ status: 200, body: {} }];
        const index = Math.min(calls[path] || 0, answers.length - 1);
        calls[path] = (calls[path] || 0) + 1;
        const { status = 200, body } = answers[index];
        return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
    });
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

beforeEach(() => localStorage.clear());

test('the upload page refuses a file that is not a PDF', async () => {
    mockApi({});
    await renderAt('/convert');
    const input = document.querySelector('#bf-pdf');
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });

    await act(async () => fireEvent.change(input, { target: { files: [file] } }));

    expect(screen.getByRole('alert')).toHaveTextContent('That file isn’t a PDF.');
});

test('the reading page follows the steps until the book is ready', async () => {
    mockApi({
        [`/api/convert/${ID}`]: [
            { body: conversion({ step: 1 }) },
            { body: conversion({ status: 'ready', step: 2, book: BOOK }) },
        ],
    });
    await renderAt(`/convert/${ID}`);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Reading your book…');
    expect(screen.getByText('Finding paragraphs').closest('li')).toHaveClass('now');
    expect(screen.getByText('Reading the PDF').closest('li')).toHaveClass('done');

    expect(await screen.findByText('Your book is ready to check.')).toBeInTheDocument();
    expect(screen.getByText('Jane Austen')).toBeInTheDocument();
    expect(screen.getByText('2040')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Check and fix' })).toHaveAttribute('href', `/convert/${ID}/edit`);
});

test('a failed reading says so, with the reason', async () => {
    mockApi({
        [`/api/convert/${ID}`]: [{ body: conversion({ status: 'failed', error: 'no text in the PDF' }) }],
    });
    await renderAt(`/convert/${ID}`);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bookflow couldn’t read this book.');
    expect(screen.getByRole('alert')).toHaveTextContent('no text in the PDF');
});

test('an unknown conversion shows a not-found message', async () => {
    mockApi({ [`/api/convert/${ID}`]: [{ status: 404, body: { error: 'not_found' } }] });
    await renderAt(`/convert/${ID}`);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This conversion doesn’t exist.');
});
