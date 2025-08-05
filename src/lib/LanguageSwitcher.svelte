<script lang="ts">
  import { locale, locales } from 'svelte-i18n';
  import { browser } from '$app/environment';
  
  function handleLocaleChange(newLocale: string) {
    locale.set(newLocale);
    if (browser) {
      localStorage.setItem('locale', newLocale);
    }
  }
  
  $: currentLocale = $locale || 'it';
</script>

<div class="flex items-center gap-1 rounded-md bg-box px-2 py-1">
  <button
    class="px-2 py-1 text-sm font-medium rounded transition-all {currentLocale === 'it' ? 'bg-primary text-black' : 'hover:bg-gray-200'}"
    onclick={() => handleLocaleChange('it')}
    title="Italiano"
  >
    IT
  </button>
  <button
    class="px-2 py-1 text-sm font-medium rounded transition-all {currentLocale === 'en' ? 'bg-primary text-black' : 'hover:bg-gray-200'}"
    onclick={() => handleLocaleChange('en')}
    title="English"
  >
    EN
  </button>
</div>