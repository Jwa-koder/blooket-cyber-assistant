'use strict';

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== 'cyber-assistant:open') return;
  (async () => {
    const url = new URL(sender.url || 'about:blank');
    if (sender.tab?.id == null || sender.frameId !== 0 ||
        url.protocol !== 'https:' || url.hostname !== 'cyber.blooket.com') {
      throw new Error('The assistant is limited to a top-level Cyber Hack tab.');
    }
    const { enabled } = await chrome.storage.local.get({ enabled: true });
    if (enabled === false) return { injected: false };
    await chrome.scripting.executeScript({
      target: { tabId: sender.tab.id, frameIds: [0] },
      files: ['assistant.js'],
      world: 'MAIN'
    });
    return { injected: true };
  })().then(respond, error => respond({ error: String(error) }));
  return true;
});
