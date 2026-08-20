const urlEl = document.getElementById("url");
const button = document.getElementById("save");

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

currentTab().then((tab) => {
  urlEl.textContent = tab?.url || "This tab has no URL.";
});

button.addEventListener("click", async () => {
  const tab = await currentTab();
  if (!tab?.url) return;
  chrome.runtime.sendMessage({ type: "SAVE_TAB", url: tab.url });
});
