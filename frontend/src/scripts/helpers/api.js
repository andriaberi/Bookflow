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
    if (!cookie('csrftoken')) await fetch('/api/convert/csrf', { credentials: 'same-origin' });
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

export async function getInfo() {
    const response = await fetch('/api/info');
    if (!response.ok) throw await readError(response);
    return response.json();
}

export async function getBooks() {
    const response = await fetch('/api/library/');
    if (!response.ok) throw await readError(response);
    return response.json();
}

// Uploads the PDF, telling onProgress the share sent so far (0 to 1). Uses XHR, as
// fetch can't report upload progress.
export async function uploadPdf(file, onProgress = () => {}) {
    const token = await csrfToken();
    const form = new FormData();
    form.append('pdf', file);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/convert/');
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

export async function getConversion(id) {
    const response = await fetch(`/api/convert/${id}`);
    if (!response.ok) throw await readError(response);
    return response.json();
}

// The editor

export async function getBook(id) {
    const response = await fetch(`/api/convert/${id}/book`);
    if (!response.ok) throw await readError(response);
    return response.json();
}

// Saves the edited book; answers with its problems (what keeps it from being written).
export async function saveBook(id, book) {
    const response = await fetch(`/api/convert/${id}/book`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': await csrfToken() },
        body: JSON.stringify(book),
    });
    if (!response.ok) throw await readError(response);
    return response.json();
}

export function pageUrl(id, number, width = 700) {
    return `/api/convert/${id}/pages/${number}.png?width=${width}`;
}

// The book as an EPUB file, and the name to save it under.
export async function getEpub(id) {
    const response = await fetch(`/api/convert/${id}/epub`);
    if (!response.ok) throw await readError(response);
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename\*=UTF-8''([^;]+)/);
    return { blob: await response.blob(), filename: match ? decodeURIComponent(match[1]) : 'book.epub' };
}

// Replaces the cover with an image file; answers with the new cover's address.
export async function uploadCover(id, file) {
    const form = new FormData();
    form.append('cover', file);
    const response = await fetch(`/api/convert/${id}/cover`, {
        method: 'POST',
        headers: { 'X-CSRFToken': await csrfToken() },
        body: form,
    });
    if (!response.ok) throw await readError(response);
    return response.json();
}

export async function removeCover(id) {
    const response = await fetch(`/api/convert/${id}/cover`, {
        method: 'DELETE',
        headers: { 'X-CSRFToken': await csrfToken() },
    });
    if (!response.ok) throw await readError(response);
    return response.json();
}

// The address of the EPUB page block `blockId` is written on, for the preview.
export async function getPreviewUrl(id, blockId) {
    const response = await fetch(`/api/convert/${id}/preview?block=${encodeURIComponent(blockId)}`);
    if (!response.ok) throw await readError(response);
    return (await response.json()).url;
}

// The EPUB page at `url`, ready to show in a frame: a <base> makes its stylesheet,
// fonts and images load from the same place in the EPUB.
export async function getPreviewPage(url) {
    const response = await fetch(url);
    if (!response.ok) throw await readError(response);
    const page = await response.text();
    const base = `<base href="${url.slice(0, url.lastIndexOf('/') + 1)}">`;
    return page.replace(/<head(\s[^>]*)?>/i, (head) => `${head}${base}`);
}
