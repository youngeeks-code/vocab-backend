const PromptTemplate = require('../models/PromptTemplate');
const { renderTemplate } = require('../utils/promptTemplate');

async function getActiveTemplateContent(type) {
  const template = await PromptTemplate.findOne({ type, active: true });
  if (!template) {
    const err = new Error(`No active "${type}" prompt template configured`);
    err.status = 500;
    throw err;
  }
  return template.content;
}

function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
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

// PLACEHOLDER — once a provider is chosen (bring-your-own-AI), call it here with
// `renderedPrompt` and feed the raw text reply into parseAiResponse() below.
// dueWords: candidate Word docs (priority/neglect sorted, exclusions already applied)
// topicGuidance: combined guidance-queue + ad-hoc topic text, may be ''
async function generatePromptWithAI(dueWords, topicGuidance, { minWords, maxWords } = {}) {
  const template = await getActiveTemplateContent('ai');
  const renderedPrompt = renderTemplate(template, {
    WORD_LIST: formatWordListForAI(dueWords),
    MIN_WORDS: minWords,
    MAX_WORDS: maxWords,
    TOPIC_GUIDANCE: topicGuidance,
  });

  const err = new Error(
    'Live AI prompt generation not implemented yet. Wire services/aiService.js up to send ' +
    '`renderedPrompt` to your chosen provider, then parse the reply with parseAiResponse().'
  );
  err.status = 501;
  err.renderedPrompt = renderedPrompt; // kept on the error for debugging/inspection until this is wired up
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
// Not called anywhere yet — this is the seam a real provider call will use
// once one exists, kept here (and tested) so that wiring is a small change.
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
