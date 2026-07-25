const router = require('express').Router();
const ctrl = require('../controllers/words.controller');

router.get('/', ctrl.listWords);
router.get('/:id', ctrl.getWord);
router.post('/', ctrl.createWord);
router.patch('/:id', ctrl.updateWord);
router.patch('/:id/use', ctrl.markUsed);
router.delete('/:id', ctrl.deleteWord);

module.exports = router;
