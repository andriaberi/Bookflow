// Matchers for the page's elements: toBeInTheDocument(), toHaveTextContent() and the like.
import '@testing-library/jest-dom';

// React Router 7 needs TextEncoder, which Jest's jsdom doesn't provide.
import { TextDecoder, TextEncoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
