(() => {
  const key = 'bubbletasks_compact_mode_v1';
  const enabled = () => localStorage.getItem(key) === 'true';
  const apply = () => {
    const on = enabled();
    document.documentElement.classList.toggle('bubbletasks-compact', on);
    const button = document.getElementById('compactToggleButton');
    if (button) {
      button.textContent = 'Compact: ' + (on ? 'on' : 'off');
      button.setAttribute('aria-pressed', String(on));
      button.title = on ? 'Show Google details, completed calendar tasks, and connection panels' : 'Hide Google details, completed calendar tasks, and connection panels';
    }
  };
  apply();
  window.addEventListener('DOMContentLoaded', () => {
    apply();
    document.getElementById('compactToggleButton').addEventListener('click', () => {
      localStorage.setItem(key, String(!enabled())); apply();
    });
  });
  window.addEventListener('storage', (event) => { if (event.key === key) apply(); });
})();
