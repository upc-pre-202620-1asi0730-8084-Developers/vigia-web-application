export const LOCALE_STORAGE_KEY = 'vigia.locale';
export const SUPPORTED_LOCALES = ['en', 'es'];
export function initialLocale(storage) {
    try { const value = storage?.getItem(LOCALE_STORAGE_KEY); return SUPPORTED_LOCALES.includes(value) ? value : 'en'; }
    catch { return 'en'; }
}
export function saveLocale(storage, value) {
    if (!SUPPORTED_LOCALES.includes(value) || typeof storage?.setItem !== 'function') return false;
    try { storage?.setItem(LOCALE_STORAGE_KEY, value); return true; } catch { return false; }
}
