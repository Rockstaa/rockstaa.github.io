// Colour theme. Loaded as a classic (blocking) script in <head>, so the right theme is set
// before the first paint and there is no dark→light flash for "system" users.
// Sets <html data-theme="dark|light"> from the setting "theme" ('system' | 'dark' | 'light').
// Outside the extension (public website) chrome.* is missing and the system theme is used.
(() => {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: light)');
  let preference = 'system';

  const apply = () => {
    root.dataset.theme = preference === 'light' || (preference === 'system' && media.matches) ? 'light' : 'dark';
  };
  const read = settings => {
    const value = settings && typeof settings === 'object' ? settings.theme : undefined;
    preference = value === 'light' || value === 'dark' ? value : 'system';
    apply();
  };

  apply();
  media.addEventListener('change', apply);
  try {
    chrome.storage.local.get('settings').then(data => read(data.settings), () => {});
    // Keeps every open extension page in sync when the setting changes.
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.settings) read(changes.settings.newValue);
    });
  } catch { /* not an extension page */ }
})();
