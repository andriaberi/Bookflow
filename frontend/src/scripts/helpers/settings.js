import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from '../i18n/en';
import ka from '../i18n/ka';

const DICTIONARIES = { en, ka };

// Storage can be blocked (private windows), so every read and write may fail.
function load(key, fallback) {
    try {
        return localStorage.getItem(key) || fallback;
    } catch {
        return fallback;
    }
}

function save(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {}
}

function systemTheme() {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
    const [lang, setLang] = useState(() => load('lang', 'en'));
    const [theme, setTheme] = useState(() => load('theme', systemTheme()));

    useEffect(() => {
        document.documentElement.lang = lang;
        save('lang', lang);
    }, [lang]);

    useEffect(() => {
        document.documentElement.setAttribute('data-bs-theme', theme);
        save('theme', theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
    }, []);

    const value = useMemo(
        () => ({ lang, setLang, theme, toggleTheme, t: DICTIONARIES[lang] || en }),
        [lang, theme, toggleTheme]
    );

    return <SettingsContext.Provider value={ value }>{ children }</SettingsContext.Provider>;
}

export function useSettings() {
    return useContext(SettingsContext);
}
