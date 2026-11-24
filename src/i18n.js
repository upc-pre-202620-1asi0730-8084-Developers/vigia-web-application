import {createI18n} from "vue-i18n";
import en from "./locales/en.json";
import es from "./locales/es.json";

import {initialLocale} from './shared/presentation/locale-policy.js';
export {LOCALE_STORAGE_KEY} from './shared/presentation/locale-policy.js';
const messages = {es, en};
let storage;
try { storage = globalThis.localStorage; } catch { /* Language remains available without storage. */ }

const i18n = createI18n({
    legacy: false,
    locale: initialLocale(storage),
    fallbackLocale: 'en',
    messages
});

export default i18n;
