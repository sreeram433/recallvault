const DEFAULT_APP = "http://localhost:3000";

function vaultOrigin() {
  return (self.REELVAULT_ORIGIN || DEFAULT_APP).replace(/\/$/, "");
}

async function openSave(url) {
  const target = `${vaultOrigin()}/save?url=${encodeURIComponent(url)}`;
  await chrome.tabs.create({ url: target });
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "save-current-tab") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) await openSave(tab.url);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SAVE_TAB" && message.url) {
    openSave(message.url).then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});
