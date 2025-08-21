// panel.js
import { summarizeWithOllama } from "./summarize.js";
import { hashKey } from "./utils.js";

const el = (id) => document.getElementById(id);

let currentTabId = null;
let latestPayload = null;
let currentMode = "tldr";

const output = el("output");
const pageTitle = el("pageTitle");
const pageUrl = el("pageUrl");
const selectionNote = el("selectionNote");
const lengthRange = el("lengthRange");
const lengthValue = el("lengthValue");
const bulletsToggle = el("bulletsToggle");
const quotesToggle = el("quotesToggle");
const summarizeBtn = el("summarizeBtn");
const copyBtn = el("copyBtn");

function setOutput(text) {
  output.textContent = text;
}

function setBusy(b) {
  summarizeBtn.disabled = b;
  summarizeBtn.textContent = b ? "Summarizing…" : "Summarize";
}

function updateMeta(payload) {
  pageTitle.textContent = payload?.title || "—";
  pageUrl.textContent = payload?.url || "";
  selectionNote.hidden = !(payload?.selection && payload.selection.length > 0);
}

function getActiveMode() {
  return currentMode;
}

function bindModeButtons() {
  const group = document.getElementById("modeGroup");
  group.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-mode]");
    if (!btn) return;
    group.querySelectorAll(".mode").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
  });
}

lengthRange.addEventListener("input", () => {
  lengthValue.textContent = lengthRange.value;
});

copyBtn.addEventListener("click", async () => {
  const text = output.textContent || "";
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy"), 800);
  } catch {
    // ignore
  }
});

summarizeBtn.addEventListener("click", async () => {
  if (!latestPayload?.text) return;
  await runSummary(latestPayload);
});

async function runSummary(payload) {
  setBusy(true);
  setOutput("…");

  const opts = {
    title: payload.title,
    text: payload.selection?.length ? payload.selection : payload.text,
    mode: getActiveMode(),
    maxTokens: parseInt(lengthRange.value, 10) || 256,
    bullets: !!bulletsToggle.checked,
    quotes: !!quotesToggle.checked
  };

  // Cache key
  const cacheKey = `breeze:${opts.mode}:${opts.maxTokens}:${hashKey(opts.text)}`;
  const { breezeCache = {} } = await chrome.storage.local.get(["breezeCache"]);
  if (breezeCache[cacheKey]) {
    setOutput(breezeCache[cacheKey]);
    setBusy(false);
    return;
  }

  try {
    const result = await summarizeWithOllama(opts);
    setOutput(result);
    breezeCache[cacheKey] = result;
    // Keep cache lean
    const keys = Object.keys(breezeCache);
    if (keys.length > 100) delete breezeCache[keys[0]];
    await chrome.storage.local.set({ breezeCache });
  } catch (e) {
    setOutput(`PocketScholar Error: ${e.message}\n\nIs Ollama running on http://localhost:11434 ?\nModel pulled: llama3.1:8b-instruct-q4_0`);
  } finally {
    setBusy(false);
  }
}

async function requestPageFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  currentTabId = tab.id;
  chrome.tabs.sendMessage(tab.id, { type: "BREEZE_GET_PAGE" }, (payload) => {
    if (chrome.runtime.lastError) return;
    latestPayload = payload;
    updateMeta(payload);
  });
}

// Listen for selection payloads sent by content.js via background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "BREEZE_SELECTION_PAYLOAD") {
    latestPayload = msg.payload;
    updateMeta(latestPayload);
    runSummary(latestPayload);
  }
  if (msg?.type === "BREEZE_ACTIVE_TAB_CHANGED" || msg?.type === "BREEZE_TAB_UPDATED") {
    requestPageFromActiveTab();
  }
});

// Init
bindModeButtons();
requestPageFromActiveTab();