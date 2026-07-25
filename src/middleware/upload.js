// Minimal multer setup so image responses have somewhere to land on disk.
// Swap destination for cloud storage (S3, etc.) if you don't want images on the server disk.
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      const err = new Error('Only image files are allowed');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

module.exports = upload;
