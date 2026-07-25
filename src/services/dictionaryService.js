// Jisho's own internal search endpoint — unofficial (no published public API),
// but free, no key, and stable enough that third-party apps have relied on it
// for years. See JISHO_API_REFERENCE.md for the full shape and confirmed
// search behavior this implementation is based on. If it ever breaks, this
// module is the only thing that needs replacing (e.g. with a self-hosted
// JMdict database) — the 501-stub shape it grew from is exactly this seam.
const JISHO_SEARCH_URL = 'https://jisho.org/api/v1/search/words';
const REQUEST_TIMEOUT_MS = 8000;

// Each (entry, sense) pair becomes one candidate — collapsing to senses[0]
// would silently throw away meanings the user may actually need.
function flattenToCandidates(jishoData) {
  const candidates = [];

  for (const entry of jishoData.data) {
    const [primary, ...altEntries] = entry.japanese;
    const altSpellings = altEntries.map((j) => ({ word: j.word, reading: j.reading }));

    for (const sense of entry.senses) {
      candidates.push({
        word: primary.word,
        reading: primary.reading,
        text: sense.english_definitions.join('; '),
        partOfSpeech: sense.parts_of_speech.join(', '),
        source: 'jisho',
        isCommon: Boolean(entry.is_common),
        jlpt: entry.jlpt || [],
        altSpellings,
      });
    }
  }

  return candidates;
}

async function searchDefinitions(word) {
  const url = `${JISHO_SEARCH_URL}?keyword=${encodeURIComponent(word)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    const wrapped = new Error(`Dictionary lookup failed for "${word}": ${err.message}`);
    wrapped.status = err.name === 'AbortError' ? 504 : 502;
    throw wrapped;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const err = new Error(`Dictionary lookup failed for "${word}": Jisho returned ${response.status}`);
    err.status = 502;
    throw err;
  }

  const data = await response.json();

  // Jisho's own ordering doesn't reliably put common words first — sort here.
  // Array.prototype.sort is stable, so entry/sense order is otherwise preserved.
  return flattenToCandidates(data).sort((a, b) => Number(b.isCommon) - Number(a.isCommon));
}

module.exports = { searchDefinitions };
