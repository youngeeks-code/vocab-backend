const router = require('express').Router();
const ctrl = require('../controllers/prompts.controller');
const responsesCtrl = require('../controllers/responses.controller');
const upload = require('../middleware/upload');

router.post('/generate', ctrl.generateTodayPrompt);
router.get('/guidance', ctrl.listGuidance);
router.post('/guidance', ctrl.addGuidance);

router.get('/', ctrl.listPrompts);
router.post('/', ctrl.savePrompt);
router.get('/:id', ctrl.getPrompt);

router.post('/:id/response', upload.single('image'), responsesCtrl.attachResponse);
router.get('/:id/response', responsesCtrl.getResponses);

module.exports = router;
