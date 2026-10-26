const status = document.getElementById("status");
const toggle = document.getElementById("toggle");

async function render() {
  const { enabled } = await chrome.storage.local.get({ enabled: true });
  status.textContent = `Panel: ${enabled ? "on" : "off"}`;
  toggle.textContent = enabled ? "Turn off" : "Turn on";
  toggle.dataset.enabled = String(enabled);
}

toggle.addEventListener("click", async () => {
  toggle.disabled = true;
  await chrome.storage.local.set({ enabled: toggle.dataset.enabled !== "true" });
  await render();
  toggle.disabled = false;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.enabled) render();
});

render();
