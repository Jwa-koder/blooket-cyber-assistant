(() => {
  'use strict';
  if (window.top !== window || window.__cyberAssistantControllerLoaded) return;
  window.__cyberAssistantControllerLoaded = true;
  let enabled = false;

  const close = () => window.dispatchEvent(new Event('cyber-assistant:close'));
  function open() {
    chrome.runtime.sendMessage({ type: 'cyber-assistant:open' }, response => {
      if (chrome.runtime.lastError || response?.error) {
        console.warn('Cyber assistant could not open:', response?.error || chrome.runtime.lastError?.message);
      }
      // An off toggle can arrive while Chrome is still injecting the panel.
      if (!enabled) close();
    });
  }
  function apply(value) {
    enabled = value !== false;
    if (enabled) open(); else close();
  }
  window.addEventListener('keydown', async event => {
    const target = event.composedPath?.()[0] || event.target;
    const editable = target instanceof Element && (target.isContentEditable ||
      target.closest('input,textarea,select,[role="textbox"]'));
    if (event.key?.toLowerCase() !== 'o' || event.repeat || event.ctrlKey ||
        event.altKey || event.metaKey || editable) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try { await chrome.storage.local.set({ enabled: !enabled }); }
    catch (error) { console.warn('Cyber assistant toggle failed:', error); }
  }, true);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.enabled) apply(changes.enabled.newValue);
  });
  chrome.storage.local.get({ enabled: true }).then(settings => apply(settings.enabled));
})();
