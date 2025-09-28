import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Ensure env is loaded even if this module is evaluated before index.js (ESM import order)
dotenv.config();

// Allow overriding via env; otherwise try candidates in order (include widely available versions)
let CANDIDATE_MODELS = [
    process.env.GEMINI_MODEL || "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro-002",
];

// System prompt for the assistant (general-purpose, safe by default). Can be overridden via AI_SYSTEM_PROMPT env var.
const SYSTEM_INSTRUCTION_DEFAULT = `
You are a helpful, knowledgeable, and versatile AI assistant. You can answer questions on any topic (e.g., programming, math, science, history, culture, creative writing, productivity) and provide step-by-step explanations, examples, and code when helpful. Be concise by default, but expand with details when asked. Ask clarifying questions if requirements are ambiguous.

Style and formatting:
- Keep a friendly, professional, conversational tone.
- Use clear structure and bullets when it improves readability.
- For code, prefer minimal, runnable snippets with brief explanations.
- For math, you may use KaTeX-compatible notation when appropriate.

Safety rules (must follow):
- If a user requests harmful, illegal, hateful, sexual, violent, or privacy-invasive content, refuse with exactly: "Sorry, I can't assist with that." (no extra words).
- Do not provide instructions that enable wrongdoing (e.g., malware, hacking, evading law enforcement), or medical/legal/financial advice beyond general information.
- Do not disclose secrets or sensitive personal data.
- Respect copyrights; provide summaries or original guidance instead of reproducing copyrighted content.

When relevant, mention assumptions or limitations, and suggest safe, constructive alternatives.
`;

const SYSTEM_INSTRUCTION = (process.env.AI_SYSTEM_PROMPT && process.env.AI_SYSTEM_PROMPT.trim())
    ? process.env.AI_SYSTEM_PROMPT.trim()
    : SYSTEM_INSTRUCTION_DEFAULT;

// Lazy state; recreated if key/model changes
let SELECTED_MODEL = CANDIDATE_MODELS[0];
let _genAI = null;
let _model = null;

async function ensureFetch() {
    if (typeof fetch === 'undefined') {
        try {
            const undici = await import('undici');
            // @ts-ignore
            globalThis.fetch = undici.fetch;
            // @ts-ignore
            globalThis.Headers = undici.Headers;
            // @ts-ignore
            globalThis.Request = undici.Request;
            // @ts-ignore
            globalThis.Response = undici.Response;
        } catch (e) {
            console.error('[AI] Failed to polyfill fetch:', e?.message || e);
        }
    }
}

function getApiKey() {
    let key = process.env.GOOGLE_GEMINI_KEY || "";
    key = String(key).trim();
    // Strip wrapping single/double quotes if present
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1).trim();
    }
    return key;
}

function ensureClient(modelName = SELECTED_MODEL) {
    const key = getApiKey();
    if (!key) return { ok: false, reason: "Missing GOOGLE_GEMINI_KEY" };
    if (!_genAI) _genAI = new GoogleGenerativeAI(key);
    if (!_model || SELECTED_MODEL !== modelName) {
        SELECTED_MODEL = modelName;
        _model = _genAI.getGenerativeModel({ model: SELECTED_MODEL, systemInstruction: SYSTEM_INSTRUCTION });
    }
    return { ok: true };
}

function withTimeout(promise, ms = 20000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), ms)),
    ]);
}

export function isAiConfigured() {
    return Boolean(getApiKey());
}

export function aiStatus() {
    const configured = isAiConfigured();
    return {
        configured,
        model: configured ? SELECTED_MODEL : null,
        reason: configured ? undefined : "Missing GOOGLE_GEMINI_KEY",
    };
}

// Backward-compatible single-turn generation
export default async function generateContent(prompt, { timeoutMs = 20000 } = {}) {
    try {
        if (!isAiConfigured()) {
            return 'AI is not configured on the server.';
        }
        // Ensure client/model; if the preferred model fails, fallback below
    await ensureFetch();
    let ok = ensureClient(SELECTED_MODEL);
        if (!ok.ok) return 'AI is not configured on the server.';
        try {
            const result = await withTimeout(_model.generateContent(prompt), timeoutMs);
            return result.response.text();
        } catch (err) {
            // Try fallbacks if initial model fails (e.g., invalid model name)
            for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
                const name = CANDIDATE_MODELS[i];
                try {
            ensureClient(name);
                    const result = await withTimeout(_model.generateContent(prompt), timeoutMs);
                    return result.response.text();
                } catch {}
            }
        console.error('[AI] generateContent failed for all models', err?.message || err);
        throw err;
        }
    } catch (e) {
    console.error('[AI] generateContent error:', e?.message || e);
        return 'Sorry, I could not process that right now.';
    }
}

// Multi-turn chat with history (stateless: history is provided by caller)
export async function generateChatReply(messages = [], { timeoutMs = 20000 } = {}) {
    try {
        if (!isAiConfigured()) {
            return 'AI is not configured on the server.';
        }
        // Expect messages as array of { from: 'user'|'ai', text: string }
        const list = Array.isArray(messages) ? messages.filter(m => m && m.text) : [];
        if (!list.length) throw new Error('No messages');
        const last = list[list.length - 1];
        const history = list.slice(0, -1).map((m) => ({
            role: m.from === 'ai' ? 'model' : 'user',
            parts: [{ text: String(m.text || '') }],
        }));

        // Try current + fallbacks with chat API
        for (let i = -1; i < CANDIDATE_MODELS.length; i++) {
            const name = i < 0 ? SELECTED_MODEL : CANDIDATE_MODELS[i];
            try {
        await ensureFetch();
        const ok = ensureClient(name);
                if (!ok.ok) break;
                const chat = _model.startChat({ history });
                const result = await withTimeout(chat.sendMessage(String(last.text || '')), timeoutMs);
                return result.response.text();
            } catch {}
        }
        // Fallback: attempt single-turn generation without history
        for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
            try {
                const ok = ensureClient(CANDIDATE_MODELS[i]);
                if (!ok.ok) break;
                const result = await withTimeout(_model.generateContent(String(last.text || '')), timeoutMs);
                return result.response.text();
            } catch {}
        }
        throw new Error('all_models_failed');
    } catch (e) {
    console.error('[AI] generateChatReply error:', e?.message || e);
        return 'Sorry, I could not process that right now.';
    }
}
