const mongoose = require('mongoose');

// A single definition candidate, whether it's the one the user picked
// or one of the alternatives returned by a dictionary search.
const definitionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    partOfSpeech: String,
    source: String, // e.g. 'jisho', 'weblio', 'manual'
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
