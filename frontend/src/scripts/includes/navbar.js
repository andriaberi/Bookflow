import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useSettings } from '../helpers/settings';
import { ChevronRight, Close, LogoMark, Menu, Moon, Sun } from './icons';

const PAGES = [
    { to: '/convert', key: 'converter' },
    { to: '/library', key: 'library' },
    { to: '/suggest', key: 'suggest' },
    { to: '/contact', key: 'contact' },
];

// Wide enough for the desktop navbar; matches Bootstrap's lg breakpoint.
const DESKTOP = '(min-width: 992px)';

function Navbar() {
    const { t, lang, setLang, theme, toggleTheme } = useSettings();
    const [open, setOpen] = useState(false);
    const location = useLocation();
    const toggleRef = useRef(null);
    const menuRef = useRef(null);

    const close = useCallback(() => setOpen(false), []);

    // Picking a page closes the menu.
    useEffect(close, [location.pathname, close]);

    // While the menu is open the page behind it is disabled: it can't be scrolled,
    // clicked, focused or read by a screen reader.
    useEffect(() => {
        if (!open) return undefined;

        const behind = document.querySelectorAll('.bf-main, .bf-footer');
        behind.forEach((element) => { element.inert = true; });
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        menuRef.current?.querySelector('a, button')?.focus();

        const onKey = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
                toggleRef.current?.focus();
            }
        };
        const desktop = window.matchMedia?.(DESKTOP);
        const onResize = () => desktop?.matches && setOpen(false);
        document.addEventListener('keydown', onKey);
        desktop?.addEventListener?.('change', onResize);

        return () => {
            behind.forEach((element) => { element.inert = false; });
            document.body.style.overflow = overflow;
            document.removeEventListener('keydown', onKey);
            desktop?.removeEventListener?.('change', onResize);
        };
    }, [open]);

    const dark = theme === 'dark';

    const languageSwitch = (
        <div className="bf-seg" role="group" aria-label={ t.nav.language }>
            <button type="button" className={ lang === 'en' ? 'on' : '' } aria-pressed={ lang === 'en' } onClick={ () => setLang('en') }>EN</button>
            <button type="button" className={ lang === 'ka' ? 'on' : '' } aria-pressed={ lang === 'ka' } onClick={ () => setLang('ka') } lang="ka">ქა</button>
        </div>
    );

    const themeToggle = (
        <button type="button" className="bf-icon-btn" aria-label={ dark ? t.nav.toLight : t.nav.toDark } onClick={ toggleTheme }>
            { dark ? <Sun size={ 18 } /> : <Moon size={ 18 } /> }
        </button>
    );

    return (
        <header className="bf-navbar">
            <nav className="container bf-navbar-inner" aria-label="Main">
                <Link to="/" className="bf-brand">
                    <span className="bf-brand-mark"><LogoMark size={ 18 } /></span>
                    Bookflow
                </Link>

                {/* Desktop */}
                <div className="bf-nav-items d-none d-lg-flex">
                    { PAGES.map((page) => (
                        <NavLink key={ page.to } to={ page.to } className="bf-nav-link">{ t.nav[page.key] }</NavLink>
                    )) }
                    { languageSwitch }
                    { themeToggle }
                </div>

                {/* Phones and tablets */}
                <button
                    ref={ toggleRef }
                    type="button"
                    className="bf-icon-btn d-lg-none ms-auto"
                    aria-label={ open ? t.nav.close : t.nav.menu }
                    aria-expanded={ open }
                    aria-controls="bf-mobile-menu"
                    onClick={ () => setOpen(!open) }
                >
                    { open ? <Close size={ 20 } /> : <Menu size={ 20 } /> }
                </button>
            </nav>

            { open && (
                <>
                    <div className="bf-menu-backdrop d-lg-none" onClick={ close } aria-hidden="true" />
                    <div id="bf-mobile-menu" ref={ menuRef } className="bf-mobile-menu d-lg-none" role="dialog" aria-modal="true" aria-label={ t.nav.menu }>
                        <div className="container">
                            <ul className="bf-menu-links">
                                { PAGES.map((page) => (
                                    <li key={ page.to }>
                                        <NavLink to={ page.to } className="bf-menu-link">
                                            { t.nav[page.key] }
                                            <ChevronRight size={ 18 } />
                                        </NavLink>
                                    </li>
                                )) }
                            </ul>

                            <div className="bf-menu-settings">
                                { languageSwitch }
                                { themeToggle }
                            </div>
                        </div>
                    </div>
                </>
            ) }
        </header>
    );
}

export default Navbar;
