import { Router } from 'express';
import User from '../controller/auth';

const router = Router();
router.post('/auth/register',  User.register);
router.post('/auth/generate-otp' , User.gennerateOTP)
router.post('/auth/verifyOTP' , User.verifyOTP)
router.patch('/auth/updateUser' , User.updateUser)
router.post('/auth/login' , User.login)
router.route('/auth/getUserByToken').get([User.verifyToken, User.isModerator],User.moderatorBoard)
export default router;