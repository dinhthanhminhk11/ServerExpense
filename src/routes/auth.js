import { Router } from 'express';
import User from '../controller/auth';
import platformCheck from '../middlewares/platformCheck';

const router = Router();

router.post('/auth/register', platformCheck(['android']), User.register);
router.post('/auth/verifyOTP', platformCheck(['android']), User.verifyOTP);
router.post('/auth/setPassword', platformCheck(['android']), User.setPassWord);
router.post('/auth/login', platformCheck(['android']), User.loginWithPass);
router.post('/auth/checkAccount', platformCheck(['android']), User.loginWithOtp);
router.post('/auth/resentOtp', platformCheck(['android']), User.gennerateOTP);
// router.get('/auth/testLogin', platformCheck(['web']),  User.testLogin);
router.get('/auth/testLogin', User.testLogin);
router.patch('/auth/updateUser', User.updateUser);

// Viết middleware đúng cú pháp
router.get('/auth/getUserByToken', User.verifyToken, User.isModerator, User.moderatorBoard);

export default router;
