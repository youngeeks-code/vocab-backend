const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  promptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prompt', required: true },

  type: { type: String, enum: ['text', 'image'], required: true },

  // For type='text': the actual written text.
  // For type='image': a path/URL to the stored file.
  content: { type: String, required: true },

  // Which target words the user actually used in this response — starts as
  // all of the prompt's targetWordIds and the user unchecks the ones they
  // skipped. Bumps each word's useCount/lastUsed (see Word.markUsed) once per
  // save, regardless of how many images were attached in that same submission.
  wordsUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Word' }],

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Response', responseSchema);
