const multer = require("multer");
const path = require('path');

const uploadsDir = path.join(__dirname, "../../audio_uploads");
const chunksDir = path.join(uploadsDir, "chunks");
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, chunksDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

module.exports = upload;