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

export const Heart = (props) => (
    <Icon strokeWidth={ 2.2 } { ...props }>
        <path d="M19 14c1.5-1.5 3-3.3 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" />
    </Icon>
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

export const Star = (props) => (
    <Icon { ...props }><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" /></Icon>
);

export const Share = (props) => (
    <Icon { ...props }>
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4" /><path d="m15.4 6.5-6.8 4" />
    </Icon>
);

export const Flag = (props) => (
    <Icon { ...props }><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></Icon>
);

export const BookIcon = (props) => (
    <Icon { ...props }><path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M20 17v4H6.5" /></Icon>
);
