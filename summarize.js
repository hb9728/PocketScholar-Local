// summarize.js — talks to Ollama at http://localhost:11434

import { truncateSmart, buildModeStyle } from "./utils.js";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "llama3.1:8b-instruct-q4_0";

export async function summarizeWithOllama({ title, text, mode, maxTokens, bullets, quotes }) {
  const system = `You are a faithful explainer. Stay grounded strictly in the provided text. If something is not stated in the text, say "not stated in the text." Avoid speculation.`;
  const style = buildModeStyle(mode, bullets, quotes);
  const truncated = truncateSmart(text, 12000);

  const prompt = [
    system,
    "",
    `TASK: ${mode.toUpperCase()} summary.`,
    `STYLE: ${style}`,
    `LIMIT: Around ${maxTokens} tokens.`,
    `TITLE: ${title || "(untitled)"}\n`,
    `TEXT:\n${truncated}`
  ].join("\n");

  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: true,
      options: {
        temperature: 0.3,
        top_p: 0.9,
        num_predict: maxTokens
      }
    })
  });

  if (!res.ok || !res.body) {
    throw new Error(`Ollama request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "", full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // Ollama streams NDJSON: each line is a JSON object with "response" chunks
    const lines = buf.split("\n");
    buf = lines.pop() || ""; // keep last partial line

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.response) {
          full += obj.response;
          // Yield to UI?
          self.postMessage?.({ type: "BREEZE_STREAM", chunk: obj.response });
        }
      } catch {
        // ignore parse errors for partial lines
      }
    }
  }

  return full.trim();
}