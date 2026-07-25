const router = require('express').Router();
const ctrl = require('../controllers/prompts.controller');
const responsesCtrl = require('../controllers/responses.controller');

router.post('/generate', ctrl.generateTodayPrompt);
router.get('/guidance', ctrl.listGuidance);
router.post('/guidance', ctrl.addGuidance);

router.get('/', ctrl.listPrompts);
router.post('/', ctrl.savePrompt);
router.get('/:id', ctrl.getPrompt);

router.post('/:id/response', responsesCtrl.attachResponse);
router.get('/:id/response', responsesCtrl.getResponses);

module.exports = router;
