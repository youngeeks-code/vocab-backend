const router = require('express').Router();
const ctrl = require('../controllers/promptTemplates.controller');

// Order matters: the literal "active" segment must be matched before the
// generic ":id" route, or "active" would be parsed as an id.
router.get('/:type/active', ctrl.getActive);
router.get('/:type/:id', ctrl.getVersion);
router.get('/:type', ctrl.listVersions);
router.post('/:type', ctrl.saveNewVersion);
router.patch('/:type/:id/activate', ctrl.activateVersion);

module.exports = router;
