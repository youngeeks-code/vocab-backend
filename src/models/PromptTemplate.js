const mongoose = require('mongoose');

// Editing the master prompt = inserting a new active version, never mutating
// one in place — older versions stay in the collection (active: false) so
// they can be listed, fetched, or restored later.
const promptTemplateSchema = new mongoose.Schema({
  // Which slot this version belongs to — 'ai' for the AI-in-app generation
  // prompt (sent to a provider, parsed via PROMPT/IDS), 'copy' for the
  // copy-pasteable template a human reads.
  type: { type: String, enum: ['ai', 'copy'], required: true },
  content: { type: String, required: true },
  active: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// DB-enforced, not just app logic: at most one active version per type.
promptTemplateSchema.index({ type: 1 }, { unique: true, partialFilterExpression: { active: true } });

module.exports = mongoose.model('PromptTemplate', promptTemplateSchema);
