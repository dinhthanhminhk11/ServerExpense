import { Router } from 'express';
import User from '../controller/auth';
const platformCheck = require('../middlewares/platformCheck');

const router = Router();
router.post('/auth/register', User.register);
router.post('/auth/verifyOTP', User.verifyOTP)
router.post('/auth/setPassword', User.setPassWord)
router.post('/auth/login', User.loginWithPass)
router.post('/auth/checkAccount', User.loginWithOtp)
router.post('/auth/resentOtp', User.gennerateOTP)

// router.get('/auth/testLogin', platformCheck(['web']),  User.testLogin);
router.get('/auth/testLogin', User.testLogin);
router.patch('/auth/updateUser', User.updateUser)
router.route('/auth/getUserByToken').get([User.verifyToken, User.isModerator], User.moderatorBoard)
export default router;