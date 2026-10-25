// Calls to the Django API. In development the CRA proxy forwards /api to :8000.

export async function getBooks() {
    const response = await fetch('/api/library/');
    if (!response.ok) throw new Error(`Failed to fetch books: ${response.status}`);
    return response.json();
}
