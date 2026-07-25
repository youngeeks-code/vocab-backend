const Anthropic = require('@anthropic-ai/sdk');
const AiSettings = require('../models/AiSettings');
const PromptTemplate = require('../models/PromptTemplate');
const { renderTemplate } = require('../utils/promptTemplate');

const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-5';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro';

// DB-stored settings (set via PUT /api/ai-settings) win; the Anthropic key
// falls back to the ANTHROPIC_API_KEY env var so a fresh deploy works before
// anyone's touched the settings UI. activeProvider picks which credentials
// actually get used — a provider's key can be stored ahead of switching to it.
async function getEffectiveSettings() {
  const stored = await AiSettings.findOne();
  const activeProvider = stored?.activeProvider || 'anthropic';

  if (activeProvider === 'gemini') {
    return {
      provider: 'gemini',
      apiKey: stored?.geminiApiKey || process.env.GEMINI_API_KEY || null,
      model: stored?.geminiModel || DEFAULT_GEMINI_MODEL,
    };
  }

  return {
    provider: 'anthropic',
    apiKey: stored?.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null,
    model: stored?.anthropicModel || DEFAULT_ANTHROPIC_MODEL,
  };
}

async function hasApiKey() {
  const { apiKey } = await getEffectiveSettings();
  return Boolean(apiKey);
}

async function getActiveTemplateContent(type) {
  const template = await PromptTemplate.findOne({ type, active: true });
  if (!template) {
    const err = new Error(`No active "${type}" prompt template configured`);
    err.status = 500;
    throw err;
  }
  return template.content;
}

function formatWordListForAI(words) {
  if (!words.length) return '(none currently due)';
  return words
    .map((w) => {
      const priorityFlag = w.priority ? 'YES' : 'NO';
      return `- [${w._id}] ${w.word}${w.reading ? ` (${w.reading})` : ''}${w.definition?.text ? ` — ${w.definition.text}` : ''} (Priority flag: ${priorityFlag})`;
    })
    .join('\n');
}

function formatWordListForCopy(words) {
  if (!words.length) return '- (none currently due)';
  return words
    .map((w) => `- ${w.word}${w.reading ? ` (${w.reading})` : ''}${w.definition?.text ? ` — ${w.definition.text}` : ''}`)
    .join('\n');
}

// Calls whichever model the deployment has configured (bring-your-own-key —
// see AiSettings / /api/ai-settings) with the rendered "ai" template, then
// parses the reply via parseAiResponse().
async function generatePromptWithAI(dueWords, topicGuidance, { minWords, maxWords } = {}) {
  const { provider, apiKey, model } = await getEffectiveSettings();
  if (!apiKey) {
    const err = new Error(
      `No ${provider} API key configured. Add one via PUT /api/ai-settings, or use mode "template" instead.`
    );
    err.status = 400;
    throw err;
  }

  const template = await getActiveTemplateContent('ai');
  const renderedPrompt = renderTemplate(template, {
    WORD_LIST: formatWordListForAI(dueWords),
    MIN_WORDS: minWords,
    MAX_WORDS: maxWords,
    TOPIC_GUIDANCE: topicGuidance,
  });

  const rawText =
    provider === 'gemini'
      ? await callGemini(apiKey, model, renderedPrompt)
      : await callAnthropic(apiKey, model, renderedPrompt);

  return parseAiResponse(rawText);
}

async function callAnthropic(apiKey, model, renderedPrompt) {
  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: renderedPrompt }],
    });
  } catch (sdkErr) {
    const err = new Error(`AI provider request failed: ${sdkErr.message}`);
    err.status = sdkErr.status || 502;
    throw err;
  }

  // Claude's safety classifiers can decline a request outright — a normal
  // 200 response with no usable content rather than a thrown error.
  if (response.stop_reason === 'refusal') {
    const err = new Error('The AI declined to generate a prompt for this request.');
    err.status = 502;
    throw err;
  }

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) {
    const err = new Error('AI response contained no text content.');
    err.status = 502;
    throw err;
  }

  return textBlock.text;
}

// PLACEHOLDER — a Gemini key can be stored via /api/ai-settings ahead of
// time, but the actual call isn't wired up yet. Swap this out for a real
// call to Google's Gemini API when that's needed.
async function callGemini() {
  const err = new Error(
    'Gemini generation not implemented yet. Switch activeProvider to "anthropic", or wire up the Gemini call in aiService.js.'
  );
  err.status = 501;
  throw err;
}

// WORKS TODAY, no API key required.
// Builds a copy-pasteable prompt the user can paste into any model themselves,
// then POST the result back to /api/prompts to save it (generatedBy: 'pasted').
async function generateMetaPrompt(dueWords, topicGuidance, { minWords, maxWords } = {}) {
  const template = await getActiveTemplateContent('copy');
  return renderTemplate(template, {
    WORD_LIST: formatWordListForCopy(dueWords),
    MIN_WORDS: minWords,
    MAX_WORDS: maxWords,
    TOPIC_GUIDANCE: topicGuidance,
  });
}

// Parses the reply format instructed in the active "ai" template:
//   PROMPT
//   <scenario text, one or more lines>
//   IDS
//   <one word ID per line, section may be empty>
function parseAiResponse(rawText) {
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');
  const isMarker = (line, name) => line.trim().replace(/:$/, '') === name;
  const promptIdx = lines.findIndex((l) => isMarker(l, 'PROMPT'));
  const idsIdx = lines.findIndex((l) => isMarker(l, 'IDS'));

  if (promptIdx === -1 || idsIdx === -1 || idsIdx <= promptIdx) {
    throw new Error(`AI reply did not match the expected PROMPT/IDS format:\n${rawText}`);
  }

  const content = lines.slice(promptIdx + 1, idsIdx).join('\n').trim();
  const targetWordIds = lines
    .slice(idsIdx + 1)
    .map((l) => l.trim())
    .filter(Boolean);

  return { content, targetWordIds };
}

module.exports = { hasApiKey, generatePromptWithAI, generateMetaPrompt, parseAiResponse };
