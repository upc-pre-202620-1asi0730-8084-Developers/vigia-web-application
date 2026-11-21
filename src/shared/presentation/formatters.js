/**
 * Formats the current date according to the active UI locale.
 * @param {string} locale - Active i18n locale (`es` or `en`).
 * @param {Date} [date] - Optional date override.
 * @returns {string} Localized human-readable date string.
 */
export function formatCurrentDate(locale, date = new Date()) {
    const tag = locale === 'en' ? 'en-US' : 'es-PE';
    return new Intl.DateTimeFormat(tag, {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}
