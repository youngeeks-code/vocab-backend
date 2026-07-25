const Word = require('../models/Word');
const Prompt = require('../models/Prompt');
const PromptGuidance = require('../models/PromptGuidance');
const aiService = require('../services/aiService');
const { isDue, sortByPriorityThenNeglect } = require('../utils/dueLogic');

// POST /api/prompts/generate
// Does NOT save anything by itself — it hands back either:
//   - a live AI-generated prompt (generatedBy: 'ai'), once aiService is implemented, or
//   - a pastable meta-prompt template (generatedBy: 'manual-template') that works today.
// The frontend then calls POST /api/prompts to persist whichever content the user ends up with.
exports.generateTodayPrompt = async (req, res, next) => {
  try {
    const words = await Word.find();
    const dueWords = sortByPriorityThenNeglect(words.filter(isDue)).slice(0, 7);

    const pendingGuidance = await PromptGuidance.find({ used: false });
    const guidanceNotes = pendingGuidance.map((g) => g.note);

    let content;
    let generatedBy;

    if (aiService.hasApiKey()) {
      content = await aiService.generatePromptWithAI(dueWords, guidanceNotes); // throws 501 until implemented
      generatedBy = 'ai';
    } else {
      content = aiService.generateMetaPrompt(dueWords, guidanceNotes);
      generatedBy = 'manual-template';
    }

    res.json({
      generatedBy,
      content,
      targetWordIds: dueWords.map((w) => w._id),
      guidanceUsed: guidanceNotes,
      ...(generatedBy === 'manual-template' && {
        note: 'No AI key configured — paste this into Claude (or any model) yourself, then POST the result to /api/prompts to save it.',
      }),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/prompts
// Persists a prompt — used both for auto-saving a live AI result, and for
// saving back content the user generated elsewhere and pasted in.
exports.savePrompt = async (req, res, next) => {
  try {
    const { date, content, generatedBy, targetWordIds, guidanceUsed } = req.body;
    if (!date || !content) return res.status(400).json({ error: 'date and content are required' });

    const prompt = await Prompt.create({
      date,
      content,
      generatedBy: generatedBy || 'pasted',
      targetWordIds,
      guidanceUsed,
    });

    if (guidanceUsed?.length) {
      await PromptGuidance.updateMany({ note: { $in: guidanceUsed } }, { used: true });
    }

    res.status(201).json(prompt);
  } catch (err) {
    next(err);
  }
};

// GET /api/prompts  -> history, newest first
exports.listPrompts = async (req, res, next) => {
  try {
    const prompts = await Prompt.find().sort({ date: -1 });
    res.json(prompts);
  } catch (err) {
    next(err);
  }
};

// GET /api/prompts/:id
exports.getPrompt = async (req, res, next) => {
  try {
    const prompt = await Prompt.findById(req.params.id).populate('targetWordIds');
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    res.json(prompt);
  } catch (err) {
    next(err);
  }
};

// POST /api/prompts/guidance   { note: "please ask me about food" }
exports.addGuidance = async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ error: 'note is required' });
    const created = await PromptGuidance.create({ note });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

// GET /api/prompts/guidance?includeUsed=false
exports.listGuidance = async (req, res, next) => {
  try {
    const filter = req.query.includeUsed === 'true' ? {} : { used: false };
    const notes = await PromptGuidance.find(filter).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    next(err);
  }
};
