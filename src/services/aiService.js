function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// PLACEHOLDER — once the prompt design is finalized, call the Claude (or other) API here
// server-side, using process.env.ANTHROPIC_API_KEY, and return the generated prompt text.
// dueWords: array of Word docs (already sorted by priority/neglect, capped to a handful)
// guidanceNotes: array of strings, e.g. ["please ask me about food"]
async function generatePromptWithAI(dueWords, guidanceNotes) {
  const err = new Error(
    'Live AI prompt generation not implemented yet. Wire services/aiService.js up to call ' +
    'the Claude API once the prompt template is finalized.'
  );
  err.status = 501;
  throw err;
}

// WORKS TODAY, no API key required.
// Builds a copy-pasteable prompt the user can paste into any model themselves,
// then POST the result back to /api/prompts to save it (generatedBy: 'pasted').
function generateMetaPrompt(dueWords, guidanceNotes) {
  const wordList = dueWords.length
    ? dueWords
        .map((w) => `- ${w.word}${w.reading ? ` (${w.reading})` : ''}${w.definition?.text ? ` — ${w.definition.text}` : ''}`)
        .join('\n')
    : '- (none currently due)';

  const guidanceList = guidanceNotes.length ? guidanceNotes.map((g) => `- ${g}`).join('\n') : '- (none)';

  return [
    'I am learning Japanese. Below is a list of vocabulary I need to reuse, plus optional topic guidance from me.',
    '',
    'Words needing reuse:',
    wordList,
    '',
    'Topic guidance from me:',
    guidanceList,
    '',
    'Write a short (3-4 sentence) real-life scenario or topic in English that I could journal or ' +
      'text about today — picking the best-fit topic given my guidance and which words are most overdue — ' +
      'that would naturally require several of these words if I wrote about it in Japanese.',
    'Do not write any Japanese. Do not write example sentences using the words yourself — just describe the situation.',
    'End with one line noting which words the scenario naturally invites.',
  ].join('\n');
}

module.exports = { hasApiKey, generatePromptWithAI, generateMetaPrompt };
