// The same limit the server checks (MAX_PDF_SIZE_MB); checked here too, so a big file
// is refused before it's uploaded.
export const MAX_PDF_MB = 100;
// The server's MAX_PDF_PAGES, for its message when a PDF has more
export const MAX_PDF_PAGES = 2000;

function isPdf(file) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

// The error code for a file that can't be sent as a PDF, or '' if it can.
export function pdfProblem(file) {
    if (!isPdf(file)) return 'not_pdf';
    if (file.size > MAX_PDF_MB * 1024 * 1024) return 'too_big';
    return '';
}
