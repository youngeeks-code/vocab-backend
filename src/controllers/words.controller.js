const Word = require('../models/Word');
const { isDue, sortByPriorityThenNeglect } = require('../utils/dueLogic');

// GET /api/words?dueOnly=true
exports.listWords = async (req, res, next) => {
  try {
    const words = await Word.find();
    const filtered = req.query.dueOnly === 'true' ? words.filter(isDue) : words;
    res.json(sortByPriorityThenNeglect(filtered));
  } catch (err) {
    next(err);
  }
};

// GET /api/words/:id
exports.getWord = async (req, res, next) => {
  try {
    const word = await Word.findById(req.params.id);
    if (!word) return res.status(404).json({ error: 'Word not found' });
    res.json(word);
  } catch (err) {
    next(err);
  }
};

// POST /api/words
// Expects the definition the user already picked from the dictionary search step,
// plus optionally the full candidate list so they can re-pick later without re-searching.
exports.createWord = async (req, res, next) => {
  try {
    const { word, reading, definition, candidateDefinitions, tags, notes, priority } = req.body;
    if (!word) return res.status(400).json({ error: 'word is required' });

    const created = await Word.create({
      word,
      reading,
      definition,
      candidateDefinitions,
      tags,
      notes,
      priority: Boolean(priority),
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/words/:id
// General edit — definition swap, notes, tags, priority toggle, reading fix, etc.
exports.updateWord = async (req, res, next) => {
  try {
    const updates = (({ word, reading, definition, candidateDefinitions, tags, notes, priority }) => ({
      word,
      reading,
      definition,
      candidateDefinitions,
      tags,
      notes,
      priority,
    }))(req.body);

    // Drop undefined keys so a partial PATCH doesn't null out untouched fields.
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const updated = await Word.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return res.status(404).json({ error: 'Word not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/words/:id/use
// Marks the word used today — increments count, bumps lastUsed, effectively
// resets its position in the neglect queue.
exports.markUsed = async (req, res, next) => {
  try {
    const date = req.body.date ? new Date(req.body.date) : new Date();
    const updated = await Word.findByIdAndUpdate(
      req.params.id,
      { $inc: { useCount: 1 }, $set: { lastUsed: date } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Word not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/words/:id
exports.deleteWord = async (req, res, next) => {
  try {
    const deleted = await Word.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Word not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
