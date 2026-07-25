const router = require('express').Router();
const ctrl = require('../controllers/dictionary.controller');

router.get('/search', ctrl.searchWord);

module.exports = router;
