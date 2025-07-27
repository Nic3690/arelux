import { browser } from '$app/environment';
import { init, register } from 'svelte-i18n';

const defaultLocale = 'it';

// Registra le lingue disponibili
register('it', () => import('./locales/it.json'));
register('en', () => import('./locales/en.json'));

// Inizializza svelte-i18n
init({
  fallbackLocale: defaultLocale,
  initialLocale: browser ? window.localStorage.getItem('locale') ?? defaultLocale : defaultLocale,
});