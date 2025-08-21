// background.js (service worker)

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "breeze_summarize_selection",
    title: "Breeze: Summarize selection",
    contexts: ["selection"]
  });
});

// Open side panel when toolbar icon clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  await chrome.sidePanel.open({ tabId: tab.id });
});

// If user right-clicks selection, open panel and ask content.js for selection
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "breeze_summarize_selection" && tab?.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
    chrome.tabs.sendMessage(tab.id, { type: "BREEZE_GET_SELECTION" });
  }
});

// When tab changes or reloads, tell the panel (if open) to refresh metadata
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.runtime.sendMessage({ type: "BREEZE_ACTIVE_TAB_CHANGED", tabId });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    chrome.runtime.sendMessage({ type: "BREEZE_TAB_UPDATED", tabId });
  }
});