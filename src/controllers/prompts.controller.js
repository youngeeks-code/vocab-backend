const Word = require('../models/Word');
const Prompt = require('../models/Prompt');
const PromptGuidance = require('../models/PromptGuidance');
const aiService = require('../services/aiService');
const { isDue, sortByPriorityThenNeglect } = require('../utils/dueLogic');

const DEFAULT_MIN_WORDS = 3;
const DEFAULT_MAX_WORDS = 7;
// Sanity cap on how many due words get sent to the AI-in-app mode — the AI narrows
// from this list itself (that's the "compatibility" selection), so it's deliberately
// looser than the copy-paste mode's hard maxWords slice.
const AI_MODE_CANDIDATE_CAP = 30;

// POST /api/prompts/generate
//   { mode: 'ai' | 'template', minWords, maxWords, excludedWordIds, includedWordIds, topicRequest }
// Does NOT save anything by itself — it hands back one of:
//   - mode 'ai'       -> a live AI-generated prompt (generatedBy: 'ai'), calling
//                        whichever provider/model is configured via
//                        /api/ai-settings (bring-your-own-key). Throws 400 if
//                        no key is configured — use mode 'template' instead.
//   - mode 'template' -> a pastable meta-prompt (generatedBy: 'manual-template') that
//                        works today, built from the words THIS endpoint already picked.
// The frontend then calls POST /api/prompts to persist whichever content the user ends
// up with — including a third path, 'pasted', for a prompt the user wrote/sourced
// entirely themselves and never touches this endpoint at all.
//
// includedWordIds lets the user manually pull in words the SRS logic doesn't
// consider due yet (the Generate Prompt screen's "include anyway" picker,
// populated from GET /api/words?dueOnly=false) — it's a pure addition to the
// due set, not a replacement of it. excludedWordIds still wins if a word
// somehow ends up in both lists.
exports.generateTodayPrompt = async (req, res, next) => {
  try {
    const {
      mode = 'template',
      minWords = DEFAULT_MIN_WORDS,
      maxWords = DEFAULT_MAX_WORDS,
      excludedWordIds = [],
      includedWordIds = [],
      topicRequest = '',
    } = req.body || {};

    const excluded = new Set(excludedWordIds.map(String));
    const included = new Set(includedWordIds.map(String));
    const words = await Word.find();
    const dueWords = sortByPriorityThenNeglect(
      words
        .filter((w) => isDue(w) || included.has(String(w._id)))
        .filter((w) => !excluded.has(String(w._id)))
    );

    const pendingGuidance = await PromptGuidance.find({ used: false });
    const guidanceNotes = pendingGuidance.map((g) => g.note);
    const topicGuidance = [...guidanceNotes, topicRequest].filter(Boolean).join('; ');

    let content;
    let generatedBy;
    let targetWordIds;

    if (mode === 'ai') {
      const candidates = dueWords.slice(0, AI_MODE_CANDIDATE_CAP);
      const result = await aiService.generatePromptWithAI(candidates, topicGuidance, { minWords, maxWords });
      content = result.content;
      targetWordIds = result.targetWordIds;
      generatedBy = 'ai';
    } else {
      const candidates = dueWords.slice(0, maxWords);
      content = await aiService.generateMetaPrompt(candidates, topicGuidance, { minWords, maxWords });
      generatedBy = 'manual-template';
      targetWordIds = candidates.map((w) => w._id);
    }

    res.json({
      generatedBy,
      content,
      targetWordIds,
      guidanceUsed: guidanceNotes,
      ...(generatedBy === 'manual-template' && {
        note: 'Paste this into Claude (or any model) yourself, then POST the result to /api/prompts to save it.',
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
