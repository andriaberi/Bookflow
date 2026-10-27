import { useEffect } from 'react';
import { markLeft, markSeen } from './api';

// Under the server's grace after leaving (converter/cleanup.py), so a reload is back
// in time to keep the conversion.
const HEARTBEAT_MS = 30 * 1000;

// While a conversion's page is open, tells the server so; on leaving, says that too,
// and the server deletes the conversion soon after.
export function useConversionOpen(id) {
    useEffect(() => {
        const seen = () => markSeen(id).catch(() => {});
        const left = () => markLeft(id);
        seen();
        const timer = setInterval(seen, HEARTBEAT_MS);
        window.addEventListener('pagehide', left);
        // Back from the browser's back-forward cache
        window.addEventListener('pageshow', seen);
        return () => {
            clearInterval(timer);
            window.removeEventListener('pagehide', left);
            window.removeEventListener('pageshow', seen);
            left();
        };
    }, [id]);
}
