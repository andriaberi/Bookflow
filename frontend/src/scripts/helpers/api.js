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
