import { Router } from 'express';
import User from '../controller/auth';
import { setAuth } from '../middlewares/auth';

const router = Router();
router.post('/auth/register',  User.register);
router.post('/auth/generate-otp' , User.gennerateOTP)
router.post('/auth/verifyRegister' , User.verifyRegister)
router.post('/auth/login' , User.login)

export default router;