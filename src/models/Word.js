const mongoose = require('mongoose');

// Other valid kanji/kana forms for the same reading (Jisho's japanese[] entries
// beyond the primary one).
const altSpellingSchema = new mongoose.Schema({ word: String, reading: String }, { _id: false });

// A single definition candidate, whether it's the one the user picked
// or one of the alternatives returned by a dictionary search.
const definitionSchema = new mongoose.Schema(
  {
    // Primary form for this candidate — a search can surface entries whose
    // word/reading differ from the parent Word (compounds, related matches).
    word: { type: String, trim: true },
    reading: { type: String, trim: true },
    text: { type: String, required: true },
    partOfSpeech: String,
    source: String, // e.g. 'jisho', 'weblio', 'manual'
    isCommon: Boolean,
    jlpt: [String],
    altSpellings: [altSpellingSchema],
  },
  { _id: false }
);

const wordSchema = new mongoose.Schema({
  word: { type: String, required: true, trim: true },
  reading: { type: String, trim: true },

  // The definition the user actually selected from search results.
  definition: definitionSchema,

  // Kept so the user can re-pick without re-searching.
  candidateDefinitions: [definitionSchema],

  tags: [{ type: String, trim: true }],
  notes: { type: String, default: '' },

  // Manual override — beats the neglect-based due logic entirely.
  priority: { type: Boolean, default: false },

  useCount: { type: Number, default: 0 },
  lastUsed: { type: Date, default: null },

  addedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Word', wordSchema);
