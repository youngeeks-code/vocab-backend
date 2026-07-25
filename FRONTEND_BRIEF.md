# Frontend Build Brief — Vocabulary Reuse Tracker

This is the complete, current contract of the backend. Every endpoint, field,
and status code below is live and has been tested against a running server —
nothing here is aspirational. Build against this directly.

## Base setup

- Base URL: `http://localhost:4000` in dev (from `.env` `PORT`).
- Every route is prefixed `/api/...` except the static file server at `/uploads/<filename>`.
- **Auth**: if the server has `APP_PASSWORD` set, every `/api/*` request (except `/api/health`) must carry header `X-App-Password: <password>`. It's unset today, so no header is required right now — but build the fetch wrapper to attach it from `localStorage` if present, so it works the moment someone sets the env var.
- Content-Type is `application/json` for every request **except** the image-upload endpoint, which must be `multipart/form-data`.
- **Every error response** is `{ "error": "human-readable message" }` with a real HTTP status (400/401/404/500/501/502/504). Surface `error` directly — it's already meant to be read by a person.

---

## Data models (exact shapes, straight from the Mongoose schemas)

### Word
```
{
  _id: string,
  word: string,                       // required
  reading: string,
  definition: Definition | null,      // the one the user picked
  candidateDefinitions: Definition[], // the full list it was picked from
  tags: string[],
  notes: string,                      // default ''
  priority: boolean,                  // default false — overrides neglect logic entirely
  srsIntervalDays: number | null,     // override of the global 3-day "days since last use" threshold
  srsUseCountTarget: number | null,   // override of the global 5-use threshold
  useCount: number,                   // default 0
  lastUsed: string (ISO datetime) | null,
  addedAt: string (ISO datetime),
}
```
A word is "due" if `priority === true`, OR (`useCount < srsUseCountTarget ?? 5` AND `daysSinceLastUsed > srsIntervalDays ?? 3`). This logic runs server-side — never recompute it client-side, just trust `dueOnly` filters and list ordering.

### Definition (embedded — shape of both `definition` and each `candidateDefinitions[]` entry)
```
{
  word: string,          // may differ from the parent Word (compounds, related matches)
  reading: string,
  text: string,           // required — the actual meaning/gloss
  partOfSpeech: string,
  source: string,         // 'jisho' | 'manual'
  isCommon: boolean,
  jlpt: string[],         // e.g. ["jlpt-n5"], often empty
  altSpellings: { word: string, reading: string }[],
}
```

### Prompt
```
{
  _id: string,
  date: string,                 // 'YYYY-MM-DD' — a calendar slot, NOT a full timestamp
  content: string,
  generatedBy: 'ai' | 'manual-template' | 'pasted',  // default 'manual-template'
  targetWordIds: string[],      // ObjectId refs — populated to full Word objects ONLY on GET /api/prompts/:id
  guidanceUsed: string[],       // snapshot of the guidance note text used
  createdAt: string (ISO datetime),
}
```

### PromptGuidance
```
{ _id: string, note: string, used: boolean /* default false */, createdAt: string (ISO datetime) }
```

### Response
```
{
  _id: string,
  promptId: string,
  type: 'text' | 'image',
  content: string,       // text: the text itself. image: a relative path like "/uploads/1784-file.png"
  createdAt: string (ISO datetime),
}
```

### PromptTemplate
```
{ _id: string, type: 'ai' | 'copy', content: string, active: boolean, createdAt: string (ISO datetime) }
```
Only one `active: true` per `type` at any time, enforced at the DB level. Saving a new version never deletes old ones — history is permanent.

### AiSettings (this is a built response shape, not a raw doc — same for GET and PUT)
```
{
  activeProvider: 'anthropic' | 'gemini',
  providers: {
    anthropic: {
      model: string,              // default "claude-opus-5"
      hasApiKey: boolean,
      apiKeySource: 'settings' | 'env' | null,
      apiKeyPreview: string | null,   // e.g. "sk-ant-...bQAA" — never the raw key
    },
    gemini: {
      model: string,              // default "gemini-2.5-pro"
      hasApiKey: boolean,
      apiKeySource: 'settings' | null,
      apiKeyPreview: string | null,
      note: string,                // "Key can be stored now; live Gemini calls are not wired up yet."
    },
  },
}
```

---

## Full endpoint reference

### Health
`GET /api/health` → `200 { ok: true }` — no auth required, exists even if `APP_PASSWORD` is set.

### Words
**`GET /api/words`** — optional `?dueOnly=true` (only due words) or `?dueOnly=false` (only NOT-due words — feeds the "include anyway" picker). Omit for everything.
→ `200: Word[]`, always sorted priority-first, then least-used, then most-neglected.

**`GET /api/words/:id`** → `200: Word` / `404 {error:'Word not found'}`

**`POST /api/words`** — body: `{ word (required), reading?, definition?, candidateDefinitions?, tags?, notes?, priority?, srsIntervalDays?, srsUseCountTarget? }`
→ `201: Word` / `400 {error:'word is required'}`

**`PATCH /api/words/:id`** — body: any subset of the same fields as POST. Omitted fields are left untouched. To clear an SRS override back to "use the global default," send it as `null` explicitly (not omitted).
→ `200: Word` / `404`

**`PATCH /api/words/:id/use`** — body: `{ date? }` (ISO string, optional, defaults to now). Increments `useCount`, sets `lastUsed`.
→ `200: Word` / `404`

**`DELETE /api/words/:id`** → `204` (no body) / `404`

### Dictionary
**`GET /api/dictionary/search?word=<term>`**
→ `200: { word: string, candidates: Definition[] }` — already sorted common-first. Zero matches → `candidates: []`, not an error. Can return 15-25+ results for a short prefix — render as a scrollable list, not a dropdown.
→ `400 {error:'word query param is required'}` / `502` or `504` on upstream failure.

### Prompts — generation & persistence
**`POST /api/prompts/generate`** — does **not** save anything, just returns content to review first.
Body:
```
{
  mode?: 'ai' | 'template',      // default 'template'
  minWords?: number,              // default 3
  maxWords?: number,               // default 7
  excludedWordIds?: string[],      // default [] — leave these words out entirely
  includedWordIds?: string[],      // default [] — force-include a not-due word
  topicRequest?: string,           // default '' — one-time ad hoc topic, separate from the standing guidance queue
}
```
→ `200` (mode `template`): `{ generatedBy: 'manual-template', content: string, targetWordIds: string[], guidanceUsed: string[], note: string }`
→ `200` (mode `ai`): `{ generatedBy: 'ai', content: string, targetWordIds: string[], guidanceUsed: string[] }` — `targetWordIds` here come from parsing the AI's own reply, already done server-side.
→ `400`: no AI key configured for the active provider (mode `ai` only) — tell the user to add one in AI Settings, or switch mode.
→ `501`: active provider is Gemini, which isn't wired up yet.
→ `502`: AI declined/refused, or its reply didn't parse.

**`POST /api/prompts`** — the actual save, for all three provenance types.
Body: `{ date (required, 'YYYY-MM-DD'), content (required), generatedBy? (default 'pasted'), targetWordIds?, guidanceUsed? }`
→ `201: Prompt` / `400 {error:'date and content are required'}`
Side effect: any note text present in `guidanceUsed` gets marked `used:true` in `PromptGuidance`.

**`GET /api/prompts`** → `200: Prompt[]` sorted by `date` descending. `targetWordIds` is plain ID strings here, not populated.

**`GET /api/prompts/:id`** → `200: Prompt` with `targetWordIds` populated to full `Word` objects. / `404`

**`POST /api/prompts/guidance`** — adds to the **standing** queue (different from the ad-hoc `topicRequest` above). Body: `{ note (required) }` → `201: PromptGuidance` / `400`

**`GET /api/prompts/guidance?includeUsed=true`** (default `false` = pending only) → `200: PromptGuidance[]`, newest first.

### Responses (nested under a prompt)
**`POST /api/prompts/:id/response`**
- Text: `Content-Type: application/json`, body `{ type: 'text', content: string }`
- Image: `Content-Type: multipart/form-data`, file under field name exactly `image`. **Do not** send `type`/`content` for images — the server derives both from the uploaded file. Max 10MB, image mimetypes only (enforce client-side too, to avoid a wasted round trip).
→ `201: Response` / `400 {error:'type and content are required'}` or `{error:'Only image files are allowed'}` / `404` if the prompt doesn't exist.

**`GET /api/prompts/:id/response`** → `200: Response[]`, oldest first.

### Static uploads
**`GET /uploads/<filename>`** → the raw file; use directly as `<img src="{apiBase}/uploads/<filename>">`. Gated behind `X-App-Password` the same as everything else if `APP_PASSWORD` is set.

### Prompt templates (master prompt editor)
`:type` is always `ai` or `copy`.

- **`GET /api/prompt-templates/:type/active`** → `200: PromptTemplate` (the one currently in effect)
- **`GET /api/prompt-templates/:type`** → `200: PromptTemplate[]`, full version history, newest first
- **`GET /api/prompt-templates/:type/:id`** → `200: PromptTemplate` (one specific historical version) / `404`
- **`POST /api/prompt-templates/:type`** — body `{ content (required) }`. Creates a **new** active version; the previous one is deactivated, never deleted. → `201: PromptTemplate` / `400`
- **`PATCH /api/prompt-templates/:type/:id/activate`** — rollback to any older version. → `200: PromptTemplate` / `404`

### AI settings
- **`GET /api/ai-settings`** → `200` (shape above)
- **`PUT /api/ai-settings`** — body `{ activeProvider?, anthropic?: {apiKey?, model?}, gemini?: {apiKey?, model?} }`. Send a provider's `apiKey` as `''` or `null` to clear just that one. → `200` (same shape as GET)

---

## Cross-cutting rules the frontend must follow

1. **`generatedBy` on save is a real semantic choice, not a formality:**
   - `'ai'` — mode `ai` succeeded and its content is being saved as-is.
   - `'pasted'` — the common copy-paste-mode path: the user took the template text, ran it through an external chat themselves, and is saving *that* result — not the template text itself. Also used for the fully manual "Personal Prompt" flow.
   - `'manual-template'` — reserve for the rare case where the copy-paste template text itself becomes the saved entry, unedited.
2. **Never re-sort word lists client-side.** Ordering (priority → least-used → most-neglected) is computed server-side and is load-bearing; trust what comes back.
3. **`Prompt.date` is `'YYYY-MM-DD'`, not a timestamp.** Every other date field (`createdAt`, `addedAt`, `lastUsed`) is a full ISO datetime — don't run `date` through timezone-aware parsing expecting time-of-day.
4. **The AI-mode reply is already parsed server-side.** `POST /api/prompts/generate` with `mode:'ai'` hands back clean `{content, targetWordIds}` — the frontend never touches the raw `PROMPT`/`IDS` text format.
5. **Master Prompt Editor is just a plain textarea.** The `{{WORD_LIST}}`, `{{MIN_WORDS}}`, `{{MAX_WORDS}}`, `{{TOPIC_GUIDANCE}}` tokens and `[[IF:...]]...[[/IF]]` blocks are edited as literal text by the user — the UI doesn't need to parse or preview-render them specially.
6. **Template history is permanent.** There will always be at least the original seeded version per type — design the History list assuming it's never empty.
7. **Image upload field name must be exactly `image`**, and it must be the only thing in that request (no accompanying JSON fields in the same body).

---

## Pages

### 1. Home / Dashboard
- Due words: `GET /api/words?dueOnly=true` — word, reading, `definition.text`, `priority` badge, "neglected N days" (compute from `lastUsed`, display-only)
- "Generate Prompt" button → page 5
- Recent prompts: last 2-3 of `GET /api/prompts`
- Pending guidance preview: `GET /api/prompts/guidance?includeUsed=false`
- Optional AI status chip: `GET /api/ai-settings` → `providers[activeProvider].hasApiKey`

### 2. Words (list)
- Filter: All / Due (`?dueOnly=true`) / Not Due (`?dueOnly=false`)
- Per row: word, reading, `definition.text`, `tags`, `priority` badge, `useCount`, `lastUsed`, an indicator if `srsIntervalDays`/`srsUseCountTarget` is non-null
- Row actions: Mark Used (`PATCH /:id/use`), Edit, Delete
- "Add Word" button → page 3

### 3. Add Word (2-step)
- Step 1: search box → `GET /api/dictionary/search?word=...`, scrollable candidate list: `word`, `reading`, `text`, `partOfSpeech`, `isCommon` badge, `jlpt` badge, `altSpellings`
- Step 2: pick a candidate → prefill; add `tags`, `notes`, `priority` checkbox, optional `srsIntervalDays`/`srsUseCountTarget`
- Manual-entry fallback (skip search entirely)
- Save → `POST /api/words`, `definition` = picked candidate, `candidateDefinitions` = the **entire** search result array

### 4. Word Detail / Edit
- Current `definition` + full `candidateDefinitions` list to re-pick from (no re-search needed)
- Editable: `reading`, `notes`, `tags`, `priority`, `srsIntervalDays`, `srsUseCountTarget` (with a "reset to default" = send `null`)
- Mark Used, Delete
- Read-only stats: `useCount`, `lastUsed`, `addedAt`

### 5. Generate Prompt
- Mode selector: **Generate with AI (in App)** / **Generate with AI (copy-paste)** / **Personal Prompt (paste your own)**
- For the first two: min/max word fields (default 3/7), excluded-words multi-select, "include anyway" picker (`GET /api/words?dueOnly=false`), ad-hoc topic textbox
- Generate → `POST /api/prompts/generate`
- AI-mode result: show `content` + resolved target words directly; on `400`/`501`/`502`, show the message and offer to switch modes
- Copy-paste result: show `content` with Copy button + a paste-back textarea for the external reply — **save that pasted result with `generatedBy:'pasted'`**, not `'manual-template'`
- Personal Prompt mode: no generate call — just `date` + `content` fields (optionally manually pick `targetWordIds`) → straight to save
- Save (all modes) → `POST /api/prompts`
- Separate small "add guidance note" box (standing queue) → `POST /api/prompts/guidance`

### 6. Prompt History
`GET /api/prompts` — date, `generatedBy` badge, content preview → click into detail

### 7. Prompt Detail
- `GET /api/prompts/:id`
- Responses: `GET /api/prompts/:id/response` — text renders as text, image renders `<img src="{apiBase}{content}">` (content is already the `/uploads/...` path)
- Add response: Text (JSON) / Image (multipart, field `image`) toggle

### 8. Master Prompt Editor
- Tab: AI-mode template / Copy-paste template
- Active content: `GET /api/prompt-templates/:type/active`, plain editable textarea
- Save → `POST /api/prompt-templates/:type {content}` (new version, auto-activated)
- History: `GET /api/prompt-templates/:type` → list with `active` flag; Restore button per entry → `PATCH /:type/:id/activate`

### 9. AI Settings
- Provider selector: Anthropic / Gemini (`activeProvider`)
- Per-provider block: model field, API key field (password-masked input), show `apiKeyPreview` + `apiKeySource`
- Gemini block clearly labeled per its `note` field — storable now, not functional yet
- Save → `PUT /api/ai-settings`; clear a key by sending `apiKey: ''`

### 10. (Inert today) App password gate
Only matters once `APP_PASSWORD` is set server-side. One-time password prompt, store in `localStorage`, attach as `X-App-Password` on every request thereafter.
