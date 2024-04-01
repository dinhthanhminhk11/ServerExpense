import { Router } from 'express';
import auth from '../controller/auth';
const router = Router();

router.route('/artist/:id').get(auth.getArtistAndAlbumAndSongByArtistId)

export default router;