import { Router } from 'express';
import Song from '../controller/song';
const router = Router();
router.post('/song/addSong',  Song.addSong);

export default router;