// Fills {name} placeholders in translated text: fill('{n} pages', { n: 65 }).
export function fill(text, values) {
    return text.replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
}

// Bytes as megabytes with one decimal: 0.5, 12.3.
export function megabytes(bytes) {
    return (bytes / (1024 * 1024)).toFixed(1);
}
