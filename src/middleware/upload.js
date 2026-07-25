// PLACEHOLDER — minimal multer setup so image responses have somewhere to land.
// Swap destination for cloud storage (S3, etc.) if you don't want images on the server disk.
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

module.exports = upload;
