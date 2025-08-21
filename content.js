// content.js
// Lightweight extractor with a good-enough fallback.
// (You can swap in Mozilla Readability later for even cleaner extraction.)

function getVisibleText() {
  // Remove script/style/noscript for cleaner innerText
  const cloned = document.documentElement.cloneNode(true);
  const kill = cloned.querySelectorAll("script,style,noscript,svg,canvas,iframe");
  kill.forEach((n) => n.remove());
  const body = cloned.querySelector("body");
  return (body?.innerText || document.body?.innerText || "").replace(/\s+\n/g, "\n").trim();
}

function guessArticleText() {
  // Prefer <article> or main content
  const article = document.querySelector("article");
  if (article && article.innerText.split(/\s+/).length > 100) {
    return article.innerText.trim();
  }
  const main = document.querySelector("main");
  if (main && main.innerText.split(/\s+/).length > 150) {
    return main.innerText.trim();
  }
  return getVisibleText();
}

function getSelectionText() {
  return (window.getSelection && String(window.getSelection())) || "";
}

function getPayload(preferSelection = false) {
  const selection = getSelectionText();
  const text = preferSelection && selection?.length > 0 ? selection : guessArticleText();
  return {
    url: location.href,
    title: document.title || "",
    selection,
    text
  };
}

// Respond to panel requests
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "BREEZE_GET_PAGE") {
    sendResponse(getPayload(false));
    return true;
  }
  if (msg?.type === "BREEZE_GET_SELECTION") {
    // Send selection payload to the panel
    chrome.runtime.sendMessage({ type: "BREEZE_SELECTION_PAYLOAD", payload: getPayload(true) });
    return true;
  }
});