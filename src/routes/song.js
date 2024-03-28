import { Router } from 'express';
import Song from '../controller/song';
const router = Router();
router.route('/song').post(Song.addSong).get(Song.getAllSong)

export default router;