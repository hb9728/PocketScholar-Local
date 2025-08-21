// utils.js
export function truncateSmart(text, maxChars = 12000) {
  if (!text || text.length <= maxChars) return text || "";
  // Keep intro + ending (capture conclusion)
  const head = Math.floor(maxChars * 0.75);
  const tail = maxChars - head;
  return text.slice(0, head) + "\n...\n" + text.slice(-tail);
}

export function buildModeStyle(mode, bullets, quotes) {
  const bulletLine = bullets ? "Prefer bulleted output. " : "Write as concise paragraphs. ";
  const quoteLine = quotes ? "Include short verbatim quotes (≤ 12 words) when helpful." : "Do not include verbatim quotes.";
  switch (mode) {
    case "tldr":
      return `${bulletLine}Output 3–6 concise bullets (≤ 22 words). No fluff. ${quoteLine}`;
    case "eli5":
      return `${bulletLine}Explain with simple words, short sentences, friendly tone. Avoid jargon. ${quoteLine}`;
    case "hs":
      return `${bulletLine}High-school level (age ~18). Clear and direct. 5 bullets plus a one-sentence gist. ${quoteLine}`;
    case "masters":
      return `${bulletLine}Assume undergrad background. Emphasize method, assumptions, limitations, implications. 150–200 words. ${quoteLine}`;
    case "phd":
      return `${bulletLine}Technical tone. Identify contributions, methodology, limitations, open questions. 200–250 words. ${quoteLine}`;
    default:
      return `${bulletLine}Write a concise, clear summary. ${quoteLine}`;
  }
}

export function hashKey(str) {
  // Tiny DJB2 hash for cache keys
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}