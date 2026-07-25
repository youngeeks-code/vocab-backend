// PLACEHOLDER — wire this up to a real dictionary (Jisho API, Weblio, JMdict, etc).
// Must resolve to an array of candidate definitions so the frontend can render
// a picker rather than assuming the first result is correct:
//   [{ text, partOfSpeech, source }, ...]

async function searchDefinitions(word) {
  const err = new Error(
    `Dictionary search not implemented yet. Wire services/dictionaryService.js up to a real ` +
    `dictionary API to search for "${word}" and return candidate definitions.`
  );
  err.status = 501;
  throw err;
}

module.exports = { searchDefinitions };
