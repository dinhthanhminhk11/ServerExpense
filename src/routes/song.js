import { Router } from 'express';
import Song from '../controller/song';

const upload  = require("../middlewares/updateVideoFile");
const uploadVideo = require("../middlewares/uploadVideo");

const router = Router();
router.route('/song/check-file/:fileHash').post(Song.checkFile);
router.route('/song/upload-chunk/:fileHash/:chunkIndex').post(
  upload.single("file"),
  Song.uploadChunk
);


router.route('/song/merge-file').post(Song.mergeFile);
router.route('/song').post(Song.addSong).get(Song.getAllSong)

export default router;