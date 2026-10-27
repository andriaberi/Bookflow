// Fills {name} placeholders in translated text: fill('{n} pages', { n: 65 }).
export function fill(text, values) {
    return text.replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
}

// A file's size in the page's units: "240 KB" below a megabyte, "12.3 MB" above.
export function fileSize(bytes, units) {
    const kb = bytes / 1024;
    return kb < 1024 ? `${Math.max(1, Math.round(kb))} ${units.kb}` : `${(kb / 1024).toFixed(1)} ${units.mb}`;
}
