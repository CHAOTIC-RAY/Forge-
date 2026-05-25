# Local AI Architecture Plan (Forge)

## Problem we solved

WebLLM downloads model weights from `huggingface.co`. Browsers block those requests from deployed origins (e.g. `https://forge.chaoticstudio.workers.dev`) because Hugging Face does not send `Access-Control-Allow-Origin` for arbitrary sites.

**Fix (implemented):** Same-origin proxy `GET /api/hf-proxy/mlc-ai/<model>/...` on Cloudflare Worker and Express dev server. The client rewrites all WebLLM `model` URLs to this proxy via `buildProxiedWebLlmAppConfig()`.

---

## Local AI stack (three layers)

```mermaid
flowchart TD
  UI[Forge UI: Settings, Chat, Ideas, Widgets]
  Router[generateAppText / generateAppJson in gemini.ts]
  Builtin[Built-in: WebLLM WebGPU]
  Chrome[Chrome Prompt API Gemini Nano]
  Ollama[Local Server: Ollama / LM Studio]
  Cloud[Gemini / Groq / Puter]

  UI --> Router
  Router -->|preferredProvider builtin or Auto| Builtin
  Router -->|builtin tries first in generate| Chrome
  Router -->|preferredProvider local_proxy| Ollama
  Router -->|fallback / explicit| Cloud
  Builtin --> HFProxy[/api/hf-proxy → HuggingFace]
  Builtin --> WASM[GitHub: mlc wasm libs]
```

| Layer | Where it runs | Best for |
|-------|----------------|----------|
| **WebLLM (Built-in)** | Browser GPU (WebGPU) | Private, offline-after-download, no API key |
| **Chrome Prompt API** | Browser (if available) | Tiny tasks before WebLLM loads |
| **Ollama / LM Studio** | User's machine (`local_proxy`) | Larger models, easier ops on desktop |
| **Cloud cascade** | Worker proxy + keys | Vision, long context, reliability |

Settings → **AI Studio** controls `preferredProvider`, `builtinModelId`, `localProxyUrl`, and Auto provider order.

---

## How information reaches local models

### 1. Routing (`src/lib/gemini.ts`)

- `getEffectiveTextProvider()` — Built-in, `local_proxy`, Auto, etc.
- `generateAppText()` — single text pipeline with cascade.
- `generateAppJson()` — appends JSON-only hint, uses `safeParseJSON`.
- `withBusinessKnowledge()` — injects brand/workspace context from Firestore before the prompt is sent.

### 2. Built-in path (`src/lib/builtinAi.ts`)

1. Optional **Chrome `window.ai.languageModel`** for short string prompts.
2. **WebLLM** `CreateMLCEngine(modelId, { appConfig: buildProxiedWebLlmAppConfig() })`.
3. Messages built as:
   - `BUILTIN_SYSTEM_PROMPT` (Forge role: tasks, ideas, captions).
   - User / assistant turns from caller.
4. **Context budget** applied before inference (`src/lib/localAiContext.ts`):
   - Per-model `context_window` table (4k–8k).
   - ~72% of window for input (chars ≈ tokens × 4).
   - ~28% reserved for output (`max_tokens` cap).
   - Drops oldest non-system messages; truncates tail of last user message if needed.

### 3. Ollama path

- OpenAI-compatible HTTP (`/v1/chat/completions`).
- Full conversation sent; user must pick model size vs RAM.
- No HuggingFace proxy involved.

### 4. What is *not* sent locally

- **Images / vision** — routed to Gemini (or configured image APIs).
- **Very large brand kits** — should be summarized before local call (future: RAG chunk picker).

---

## Memory & context limits

### WebGPU / VRAM (device)

| Model | Approx download | `vram_required_MB` (MLC) | Practical RAM |
|-------|-----------------|-------------------------|---------------|
| Llama 3.2 1B q4 | ~0.8 GB | ~879 | 8 GB+ system |
| Phi-3 Mini 4k q4 | ~2.3 GB | ~3000 | 12 GB+ |
| Gemma 2 2B q4 | ~1.6 GB | ~2000 | 10 GB+ |
| Mistral 7B q4 | ~4.8 GB | ~7000 | 16 GB+, discrete GPU |
| Llama 3.1 8B q4 | ~5.2 GB | ~8000 | 16 GB+ |

If init fails with WebGPU errors → user should pick a smaller model or use Ollama/Auto.

### Context window (tokens)

| Model ID | Planned window | Notes |
|----------|----------------|-------|
| Llama-3.2-1B-Instruct-q4f16_1-MLC | 4096 | Fast default |
| Phi-3-mini-4k-instruct-q4f16_1-MLC | 4096 | Default in code |
| Gemma-2-2b-it-q4f16_1-MLC | 8192 | Heavier RAM |
| Mistral-7B-Instruct-v0.3-q4f16_1-MLC | 4096 | Quality vs size |
| Llama-3.1-8B-Instruct-q4f32_1-MLC | 4096 | Large weights |

**Rule of thumb:** total input + output must stay under `context_window`. Forge reserves ~28% for generation.

### Browser storage

- Weights cached in **Cache API / IndexedDB** (WebLLM).
- “Clear Local AI Cache” wipes caches and resets engine.
- First load on Workers domain: download via `/api/hf-proxy` (same-origin, cacheable).

### Chat-specific behavior (`chatWithAi`)

- Small messages → shortened system prompt + optional Llama chat template for JSON.
- Large prompts / tool use → cloud providers first in Auto mode.
- Local path expects **small JSON** (`message`, optional `suggestedPost`).

---

## Operational checklist

### Deployed Forge (Workers)

1. Deploy Worker with `/api/hf-proxy` route (in `src/worker.ts`).
2. Settings → Built-in → pick model → **Initialize**.
3. Watch Network tab: requests should hit `https://<your-domain>/api/hf-proxy/mlc-ai/...`, not `huggingface.co` from the browser.

### Local dev

1. Run Express server (proxies `/api/hf-proxy`).
2. Vite dev should forward `/api/*` to server (existing pattern).

### Ollama

1. `ollama serve` with `OLLAMA_ORIGINS` including your Forge origin.
2. Settings → Local Server URL `http://localhost:11434/v1`.

---

## Future improvements (recommended)

| Priority | Item |
|----------|------|
| P0 | Summarize brand kit to ≤2k chars before local calls |
| P0 | Surface context budget in UI (“Using 3.2k / 4k context”) |
| P1 | Read `context_window_size` from loaded engine config instead of static table |
| P1 | Service Worker cache policy for `/api/hf-proxy` shards |
| P2 | Optional RAG: top-k Firestore snippets instead of full paste |
| P2 | Model download progress + retry per shard |
| P3 | WebLLM in dedicated Worker (COOP/COEP) only if needed for perf |

---

## Files reference

| File | Role |
|------|------|
| `src/lib/builtinAi.ts` | WebLLM lifecycle, generate, cache |
| `src/lib/webLlmAppConfig.ts` | Proxied `appConfig` for MLC models |
| `src/lib/localAiContext.ts` | Context truncation & budgets |
| `src/lib/gemini.ts` | Provider cascade for entire app |
| `src/worker.ts` | `/api/hf-proxy` production |
| `server.ts` | `/api/hf-proxy` dev |

---

## Related docs

- [widget-tab.md](./widget-tab.md) — renaming AI Studio → Widgets toolbox
- Settings UI — provider selection and model initialize button
