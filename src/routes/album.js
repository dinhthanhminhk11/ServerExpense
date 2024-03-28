import { Router } from 'express';
import Album from '../controller/album';
const router = Router();
router.route('/album').post(Album.addAlbum).get(Album.getAllAlbum)
router.route('/album/:id').get(Album.getAlbumById)

export default router;