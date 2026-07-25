const Response = require('../models/Response');
const Prompt = require('../models/Prompt');

// POST /api/prompts/:id/response
// type: 'text'  -> content is the text blob itself
// type: 'image' -> content is a file path/URL (actual upload handling is a placeholder,
//                  see middleware/upload.js for the multer stub)
exports.attachResponse = async (req, res, next) => {
  try {
    const prompt = await Prompt.findById(req.params.id);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

    const { type, content } = req.body;
    if (!type || !content) return res.status(400).json({ error: 'type and content are required' });

    const response = await Response.create({ promptId: prompt._id, type, content });
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};

// GET /api/prompts/:id/response
exports.getResponses = async (req, res, next) => {
  try {
    const responses = await Response.find({ promptId: req.params.id }).sort({ createdAt: 1 });
    res.json(responses);
  } catch (err) {
    next(err);
  }
};
