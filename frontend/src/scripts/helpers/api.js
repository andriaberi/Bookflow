// Calls to the Django API. In development the CRA proxy forwards /api to :8000.

// An error from the API, with the code the page translates ("too_big", "not_pdf", …).
export class ApiError extends Error {
    constructor(code, detail) {
        super(detail || code);
        this.code = code;
    }
}

function cookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : '';
}

// Django wants its CSRF token back on every POST. In production the page comes from
// Django and already has the cookie; the React dev server asks the API for it.
async function csrfToken() {
    if (!cookie('csrftoken')) await fetch('/api/csrf', { credentials: 'same-origin' });
    return cookie('csrftoken');
}

async function readError(response) {
    try {
        const data = await response.json();
        return new ApiError(data.error || 'server', data.detail);
    } catch {
        return new ApiError(response.status === 404 ? 'not_found' : 'server');
    }
}

// The response, or the API's error if there is one.
async function request(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) throw await readError(response);
    return response;
}

async function getJson(url) {
    return (await request(url)).json();
}

// A request that changes something, so it carries the CSRF token.
async function send(method, url, { body, headers } = {}) {
    const response = await request(url, { method, headers: { ...headers, 'X-CSRFToken': await csrfToken() }, body });
    return response.json();
}

// The error code to show: `e`'s if the page has a message for it, else "server".
export function errorCode(e, messages) {
    return e.code in messages ? e.code : 'server';
}

export function getInfo() {
    return getJson('/api/info');
}

export function getBooks() {
    return getJson('/api/library/');
}

// Posts the form, telling onProgress the share sent so far (0 to 1). Uses XHR, as fetch
// can't report upload progress.
async function upload(url, form, onProgress = () => {}) {
    const token = await csrfToken();

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader('X-CSRFToken', token);
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) onProgress(event.loaded / event.total);
        };
        xhr.onload = () => {
            let data = {};
            try {
                data = JSON.parse(xhr.responseText);
            } catch {}
            if (xhr.status >= 200 && xhr.status < 300) resolve(data);
            else reject(new ApiError(data.error || 'server', data.detail));
        };
        xhr.onerror = () => reject(new ApiError('network'));
        xhr.send(form);
    });
}

export function getLibraryBook(id) {
    return getJson(`/api/library/${id}`);
}

export function uploadPdf(file, onProgress) {
    const form = new FormData();
    form.append('pdf', file);
    return upload('/api/convert/', form, onProgress);
}

// Sends a book suggestion: its fields, and the PDF if there is one.
export function suggestBook(fields, onProgress) {
    const form = new FormData();
    Object.entries(fields).forEach(([name, value]) => value && form.append(name, value));
    return upload('/api/library/suggestions', form, onProgress);
}

export function sendMessage(fields) {
    const body = new FormData();
    Object.entries(fields).forEach(([name, value]) => value && body.append(name, value));
    return send('POST', '/api/contact/', { body });
}

export function getConversion(id) {
    return getJson(`/api/convert/${id}`);
}

// The conversion's page is still open.
export function markSeen(id) {
    return send('POST', `/api/convert/${id}/seen`);
}

// The conversion's page is closing. A beacon still gets through as the page goes;
// it can't set headers, so the CSRF token goes in the form instead.
export function markLeft(id) {
    const form = new FormData();
    form.append('csrfmiddlewaretoken', cookie('csrftoken'));
    navigator.sendBeacon?.(`/api/convert/${id}/left`, form);
}

export function getBook(id) {
    return getJson(`/api/convert/${id}/book`);
}

// Saves the edited book; answers with its problems (what keeps it from being written).
export function saveBook(id, book) {
    return send('PUT', `/api/convert/${id}/book`, { body: JSON.stringify(book), headers: { 'Content-Type': 'application/json' } });
}

export function pageUrl(id, number, width = 700) {
    return `/api/convert/${id}/pages/${number}.png?width=${width}`;
}

// The book as an EPUB file, and the name to save it under.
export async function getEpub(id) {
    const response = await request(`/api/convert/${id}/epub`);
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename\*=UTF-8''([^;]+)/);
    return { blob: await response.blob(), filename: match ? decodeURIComponent(match[1]) : 'book.epub' };
}

// Replaces the cover with an image file; answers with the new cover's address.
export function uploadCover(id, file) {
    const body = new FormData();
    body.append('cover', file);
    return send('POST', `/api/convert/${id}/cover`, { body });
}

export function removeCover(id) {
    return send('DELETE', `/api/convert/${id}/cover`);
}

// The address of the EPUB page block `blockId` is written on, for the preview.
export async function getPreviewUrl(id, blockId) {
    return (await getJson(`/api/convert/${id}/preview?block=${encodeURIComponent(blockId)}`)).url;
}

// The EPUB page at `url`, ready to show in a frame: a <base> makes its stylesheet,
// fonts and images load from the same place in the EPUB.
export async function getPreviewPage(url) {
    const page = await (await request(url)).text();
    const base = `<base href="${url.slice(0, url.lastIndexOf('/') + 1)}">`;
    return page.replace(/<head(\s[^>]*)?>/i, (head) => `${head}${base}`);
}
