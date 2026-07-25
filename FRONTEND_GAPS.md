# Frontend Gap List — Round 2

Feedback from the first build pass, split per page into:
- **Fix now** — buildable today against the existing API, no backend change needed. Exact field/endpoint references included so this can be generated directly.
- **Needs backend** — flagged, not yet implemented. Do not build the frontend for these until the corresponding backend change lands (see `NEEDS BACKEND` blocks).

This is a delta on top of `FRONTEND_BRIEF.md` — that file is still the full API contract. This file only covers what changed based on the first build's screenshots.

---

## 1. Words page

**Gap:** No Word Detail/Edit view was shown at all — only the list. The "Edit" button needs a destination, and that destination is where the real missing functionality lives:
- Re-picking a different sense from `candidateDefinitions` (currently thrown away after Add Word — see gap #2)
- Editing `srsIntervalDays` / `srsUseCountTarget` directly (the list only shows a generic "Custom SRS" badge with no values)
- Editing `notes`, `tags`, `reading`

**Fix now** — build the Word Detail/Edit page:
- `GET /api/words/:id` → full `Word` object, including `candidateDefinitions[]`
- Show current `definition` plus a selectable list of every `candidateDefinitions[]` entry (word, reading, text, partOfSpeech, isCommon, jlpt, altSpellings) — clicking one and saving does `PATCH /api/words/:id { definition: <that candidate> }`
- SRS override fields: `srsIntervalDays`, `srsUseCountTarget` — numeric inputs, plus a "reset to default" action that sends `null` explicitly (not omitted — omitting a field in `PATCH` leaves it untouched, sending `null` clears it)
- `tags`, `notes`, `reading`, `priority` — all editable via the same `PATCH /api/words/:id`
- Mark Used (`PATCH /:id/use`) and Delete (`DELETE /:id`) belong here too, not just in the list row

**On the list itself:** consider showing the actual override value in the "Custom SRS" badge (e.g. "every 7 days") instead of a bare label — data's already on the `Word` object from the list fetch, no extra call needed.

---

## 2. Add Word page

**Gap:** The confirm screen only showed a single flattened `Definition` textarea. That's losing structure the dictionary search actually returns — `partOfSpeech`, `isCommon`, `jlpt`, `altSpellings` aren't being displayed or (more importantly) aren't being preserved as the full `candidateDefinitions[]` array to send along.

**Fix now:**
- Step 1 (search) — `GET /api/dictionary/search?word=...` → `{ word, candidates: Definition[] }`. Render as a **scrollable list** (can be 15-25+ results), each candidate showing: `word`, `reading`, `text`, `partOfSpeech`, an `isCommon` badge, a `jlpt` badge if non-empty, and `altSpellings` if present.
- Step 2 (confirm) — after picking a candidate, show its full structured fields read-only (not collapsed into one textarea): word / reading / meaning / part of speech / common badge / JLPT / alt spellings. Then editable: `tags`, `notes`, `priority`.
- **Critical:** when saving, `POST /api/words` must send **both**:
  - `definition`: the one candidate the user picked
  - `candidateDefinitions`: the **entire array** from the search response — not just the picked one. This is what makes the Word Detail re-pick feature (gap #1) possible later. If the current build only kept the merged text, this array is being silently dropped.
- Optional, your call: expose `srsIntervalDays`/`srsUseCountTarget` at creation time too (not shown in the current screenshot) — fine to defer to edit-only if you'd rather keep Add Word short.

---

## 3. Generate Prompt page — biggest rework

**Gap 3a — min/max words UI.** Currently full-width number inputs. Should be a compact dropdown (e.g. 1–10), inline, taking a fraction of the space. No API change — still just `minWords`/`maxWords` integers in the `POST /api/prompts/generate` body.

**Gap 3b — word inclusion UX is wrong.** Current build shows one flat row of bare-kanji pills with no clear checked state, mixing due and not-due words together. Correct behavior:

1. **Default view**: only **due** words — `GET /api/words?dueOnly=true`. Each rendered as a **checkbox**, **checked by default** (they're going in unless you uncheck them). Unchecking one adds its `_id` to `excludedWordIds` on generate.
2. **"Include words not due" button**, next to the due list. Clicking it fetches `GET /api/words?dueOnly=false` and **appends** those words to the same list, each rendered **unchecked by default**. The user checks them one at a time to opt them in.
3. Checking a not-due word adds its `_id` to `includedWordIds` on generate.
4. Unchecked-and-untouched not-due words: do nothing (not sent anywhere).

So the mapping is: `excludedWordIds` = due words the user manually unchecked; `includedWordIds` = not-due words the user manually checked. No backend change — `POST /api/prompts/generate` already accepts both fields exactly this way.

**Gap 3c — show word + reading + meaning, not just kanji.** Every word chip/checkbox row must show `word` (kanji/kana), `reading`, and `definition.text` (the English gloss) — the target user is a learner and currently can't tell what they're selecting from bare kanji alone. This data is already present on every `Word` object from the fetches above — no extra call needed, just render more of what you already have.

**Gap 3d — AI error handling.** When `mode:'ai'` fails, surface `error.message` directly from the response body — it's already written to be human-readable (e.g. the exact "Your credit balance is too low..." message from Anthropic passes straight through). Pair the error banner with a one-click **"Switch to Template mode"** action. No backend change — this is purely catching and displaying what the API already returns.

**Gap 3e — per-generation provider override.**

```
NEEDS BACKEND — do not build the frontend for this yet.
Today, `POST /api/prompts/generate` with mode:'ai' always uses whichever
provider is set as `activeProvider` in AiSettings — there is no way to
override it for a single generation without first going to AI Settings
and switching the default.

Planned fix: add an optional `provider?: 'anthropic' | 'gemini'` field to
the POST /api/prompts/generate request body. When present, it overrides
AiSettings.activeProvider for that one call only (does not persist).
aiService.generatePromptWithAI needs a matching parameter instead of
always reading getEffectiveSettings()'s stored activeProvider.

Once this lands: add a radio/dropdown next to the mode selector — "Use:
Anthropic (claude-opus-5) / Gemini" — populated from
GET /api/ai-settings' providers.{anthropic,gemini} objects (model name +
hasApiKey, so an unconfigured provider can be shown disabled).
```

---

## 4. Prompt History
No changes — confirmed working as-is.

## 5. Prompt Detail / responses
No changes — the text/image/both flexibility (separate `Response` documents per prompt, no requirement to have both) already matches what was asked for. Nothing to add.

---

## 6. Master Prompt Editor

**Gap 6a — token reference list.** Add a static block under the editor textarea listing every available token and what happens if it's omitted:

| Token | Meaning | If omitted from your custom template |
|---|---|---|
| `{{WORD_LIST}}` | The formatted due-word list (with IDs + Priority flag for the `ai` type, plain text for `copy`) | The AI/reader never sees which words to use — word selection breaks |
| `{{MIN_WORDS}}` | The minimum word count you set on generation | That number just won't appear anywhere in the text |
| `{{MAX_WORDS}}` | The maximum word count you set on generation | Same — silently absent, nothing errors |
| `{{TOPIC_GUIDANCE}}` | Combined ad-hoc + standing guidance text | Must be wrapped in `[[IF:TOPIC_GUIDANCE]]...[[/IF]]` or you'll get a stray label with nothing after it when guidance is empty |
| `PROMPT` / `IDS` markers (`ai` type only) | Tells the AI exactly how to structure its reply so the app can parse it back out | If you remove or rename these, `parseAiResponse` will throw and every AI-mode generation will fail until you restore them |

Also show a short caution line: *"Editing this template changes what the AI is told to do — test a generation after saving, before relying on it."*

**Gap 6b — test before saving.**
```
NEEDS BACKEND — do not build the frontend for this yet.
There is currently no way to test unsaved template content — POST
/api/prompt-templates/:type immediately saves AND activates a new version.

Planned fix: a preview endpoint, e.g.
  POST /api/prompt-templates/:type/preview   { content }
that renders `content` against real current due-word data (same
renderTemplate() call used internally) and, for type 'ai', optionally
also sends it to the currently configured provider — all without writing
anything to the database. Returns the rendered text (and the AI's reply,
if called) so the user can see the effect before committing via the real
POST /api/prompt-templates/:type.

Once this lands: add a "Test this prompt" button next to "Save as new
version" that hits the preview endpoint and shows the result inline.
```

**Gap 6c — restore to original.** Already fully supported, no gap: the very first seeded version is never deleted, it just sits at the bottom of `GET /api/prompt-templates/:type`'s history with `active: false` once something else is activated. "Restore" on that entry (`PATCH /:type/:id/activate`) is the "back to default" button — no special reset endpoint needed.

---

## 7. AI Settings
No direct gaps on this page itself — the two related items (credit-exhaustion handling, per-generation provider switch) both surface on the **Generate Prompt** page instead (see 3d and 3e above), since that's where a generation actually runs. This page stays as-is: persistent defaults only.

---

## Summary — what's safe to build right now vs. blocked

**Buildable today, no backend changes:** Word Detail/Edit page, full Jisho-field display + `candidateDefinitions` preservation on Add Word, the entire Generate Prompt word-picker/dropdown/error-display rework, the Master Prompt token reference list.

**Blocked on backend work (flagged above, not yet built):**
1. `provider` override field on `POST /api/prompts/generate` + a matching `aiService.generatePromptWithAI` parameter.
2. A template preview/test endpoint, `POST /api/prompt-templates/:type/preview`.

Let me know when you want those two built — they're small, isolated changes.
