import { fileSize, fill } from './format';

const units = { kb: 'KB', mb: 'MB' };

test('sizes are in KB below a megabyte and MB above', () => {
    expect(fileSize(300, units)).toBe('1 KB');
    expect(fileSize(240 * 1024, units)).toBe('240 KB');
    expect(fileSize(1.5 * 1024 * 1024, units)).toBe('1.5 MB');
});

test('placeholders are filled, unknown ones left', () => {
    expect(fill('{n} of {total}', { n: 2, total: 9 })).toBe('2 of 9');
    expect(fill('{n} {other}', { n: 1 })).toBe('1 {other}');
});
