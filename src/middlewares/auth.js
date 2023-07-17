import { TokenExpiredError, verify } from 'jsonwebtoken';
import { formatResponseError } from '../config';

export const setAuth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const accessToken = authHeader && authHeader.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json(formatResponseError({ code: 'not_authorized' }));
    }

    const decodedUser = verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    req.user = {
      id: decodedUser._id
    };
    return next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return res.status(401).json(formatResponseError({ code: 'expired_token' }));
    }
    return res.status(401).json(formatResponseError({ code: 'invalid_token' }));
  }
};
