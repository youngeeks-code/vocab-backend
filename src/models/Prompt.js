const mongoose = require('mongoose');

const promptSchema = new mongoose.Schema({
  date: { type: String, required: true }, // 'YYYY-MM-DD', not a Date — this is a calendar slot, not a timestamp

  content: { type: String, required: true },

  // 'ai'              -> generated live via an AI service call
  // 'manual-template' -> our own copy-pasteable template, not yet turned into a real prompt
  // 'pasted'          -> user generated it elsewhere (any model) and pasted the result back in
  generatedBy: {
    type: String,
    enum: ['ai', 'manual-template', 'pasted'],
    default: 'manual-template',
  },

  targetWordIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Word' }],
  guidanceUsed: [String], // snapshot of guidance notes consumed for this prompt

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Prompt', promptSchema);
