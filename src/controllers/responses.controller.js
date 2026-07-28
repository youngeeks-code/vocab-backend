const Response = require('../models/Response');
const Prompt = require('../models/Prompt');
const Word = require('../models/Word');

function parseWordsUsed(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string' && raw) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [raw];
    } catch {
      return [raw];
    }
  }
  return [];
}

// POST /api/prompts/:id/response
// type: 'text'  -> JSON body, content is the text blob itself
// type: 'image' -> multipart/form-data with one or more files under field name
//                  "images"; one Response doc is created per file, content is
//                  derived from the stored file, not sent by the caller
// wordsUsed: optional array of Word ids the user actually used — bumps each
// word's useCount/lastUsed once per save (see Word.markUsed), independent of
// how many image docs get created in this same submission.
exports.attachResponse = async (req, res, next) => {
  try {
    const prompt = await Prompt.findById(req.params.id);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

    const { type, content } = req.body;
    const wordsUsed = parseWordsUsed(req.body.wordsUsed);

    let created;
    if (req.files?.length) {
      created = await Response.insertMany(
        req.files.map((file) => ({
          promptId: prompt._id,
          type: 'image',
          content: `/uploads/${file.filename}`,
          wordsUsed,
        }))
      );
    } else {
      if (!type || !content) return res.status(400).json({ error: 'type and content are required' });
      created = [await Response.create({ promptId: prompt._id, type, content, wordsUsed })];
    }

    if (wordsUsed.length) {
      await Word.updateMany(
        { _id: { $in: wordsUsed } },
        { $inc: { useCount: 1 }, $set: { lastUsed: new Date() } }
      );
    }

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

// GET /api/prompts/:id/response
exports.getResponses = async (req, res, next) => {
  try {
    const responses = await Response.find({ promptId: req.params.id })
      .sort({ createdAt: 1 })
      .populate('wordsUsed', 'word reading');
    res.json(responses);
  } catch (err) {
    next(err);
  }
};
