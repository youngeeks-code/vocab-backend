const dictionaryService = require('../services/dictionaryService');

// GET /api/dictionary/search?word=食べる
// Returns candidate definitions so the frontend can present a picker —
// never assumes the first hit is the right one.
exports.searchWord = async (req, res, next) => {
  try {
    const { word } = req.query;
    if (!word) return res.status(400).json({ error: 'word query param is required' });

    const candidates = await dictionaryService.searchDefinitions(word);
    res.json({ word, candidates });
  } catch (err) {
    next(err);
  }
};
