// Stroke icons drawn in the current text color; all are decorative.

function Icon({ size = 20, strokeWidth = 2, children, ...props }) {
    return (
        <svg
            width={ size }
            height={ size }
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={ strokeWidth }
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            { ...props }
        >
            { children }
        </svg>
    );
}

export const LogoMark = (props) => (
    <Icon strokeWidth={ 2.2 } { ...props }><path d="M4 6h10" /><path d="M4 12h16" /><path d="M4 18h7" /></Icon>
);

export const ArrowRight = (props) => (
    <Icon strokeWidth={ 2.2 } { ...props }><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Icon>
);

export const Mail = (props) => (
    <Icon { ...props }><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Icon>
);

export const Sun = (props) => (
    <Icon { ...props }>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.9 4.9 1.4 1.4" /><path d="m17.7 17.7 1.4 1.4" />
        <path d="M2 12h2" /><path d="M20 12h2" /><path d="m4.9 19.1 1.4-1.4" /><path d="m17.7 6.3 1.4-1.4" />
    </Icon>
);

export const Moon = (props) => (
    <Icon { ...props }><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Icon>
);

export const Menu = (props) => (
    <Icon { ...props }><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></Icon>
);

export const FileUp = (props) => (
    <Icon { ...props }>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" />
        <path d="M12 18v-6" /><path d="m9 15 3-3 3 3" />
    </Icon>
);

export const FileIcon = (props) => (
    <Icon { ...props }><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></Icon>
);

export const Check = (props) => (
    <Icon strokeWidth={ 3 } { ...props }><path d="M20 6 9 17l-5-5" /></Icon>
);

export const Close = (props) => (
    <Icon { ...props }><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Icon>
);

export const ChevronRight = (props) => (
    <Icon { ...props }><path d="m9 6 6 6-6 6" /></Icon>
);

export const Plus = (props) => (
    <Icon strokeWidth={ 2.2 } { ...props }><path d="M12 5v14" /><path d="M5 12h14" /></Icon>
);

export const Search = (props) => (
    <Icon { ...props }><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>
);

export const Download = (props) => (
    <Icon { ...props }><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></Icon>
);

export const BookIcon = (props) => (
    <Icon { ...props }><path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M20 17v4H6.5" /></Icon>
);
