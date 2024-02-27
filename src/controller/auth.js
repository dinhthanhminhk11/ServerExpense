
import User from '../models/user';
import { formatResponseError, formatResponseSuccess, formatResponseSuccessNoData } from '../config';
const config = require('../config/auth.config');
const bcyrpt = require('bcrypt');
import { rules } from '../constants/rules';
const jwt = require('jsonwebtoken');
const { generateOTP, sendOTP } = require("../util/otp");
const crypto = require('crypto')
const { createCipheriv, createDecipheriv } = require('crypto');

const NodeRSA = require('node-rsa');
const rsa = require('../security/rsa');
const aes = require('../security/aes');
class Auth {
    async register(req, res) {
        try {
            const { key, iv, body } = req.body.data;
            console.log("register")
            console.log(req.body)
            const sessionKey = Buffer.from(rsa.decrypt(key), 'base64');
            const sessionIV = Buffer.from(rsa.decrypt(iv), 'base64');
            const {email, phone , password ,tokenDevice , fullName} = JSON.parse(aes.decrypt(body, sessionKey, sessionIV));

            const exist_email = await User.findOne({ email }).exec();

            if (exist_email) {
                return res.status(200).json(
                    formatResponseError({ code: '404' }, false, 'Email đã được đăng kí')
                );
            }

            const exist_phone = await User.findOne({ phone }).exec();

            if (exist_phone) {
                return res.status(200).json(
                    formatResponseError({ code: '404' }, false, 'Số điện thoại đã được đăng kí')
                );
            }

            const dataUserRequest = {
                email: email,
                fullName: fullName,
                phone: phone,
                password: bcyrpt.hashSync(password, 10),
                tokenDevice: tokenDevice
            };
            const user = await new User(dataUserRequest).save();

            const OTP = generateOTP();
            user.OTP = OTP;
            await user.save();
            sendOTP(email, OTP);
            const data = {
                verified: user.verified
            };
            return res.status(200).json(formatResponseSuccess(data, true, 'Đăng kí thành công'));
        } catch (error) {
            console.log('register', error);
            return res.status(400).json(formatResponseError({ code: '404' }, false, 'Error'));
        }
    }

    async gennerateOTP(req, res) {
        const email = req.body.email;
        try {
            let user = await User.findOne({ email: email });
            if (!user) {
                return res.status(200).json(
                    formatResponseError({ code: '404' }, false, 'Email chưa được đăng kí')
                );
            }

            if (user.isBlocked) {
                const currentTime = new Date();
                if (currentTime < user.blockUntil) {
                    return res.status(200).json(
                        formatResponseError({ code: '404' }, false, 'Tài khoản bị khóa. Hãy thử sau một thời gian.')
                    );
                } else {
                    user.isBlocked = false;
                    user.OTPAttempts = 0;
                }
            }

            const lastOTPTime = user.OTPCreatedTime;
            const currentTime = new Date();

            if (lastOTPTime && currentTime - lastOTPTime < 60000) {
                return res.status(200).json(
                    formatResponseError({ code: '404' }, false, 'Yêu cầu khoảng cách tối thiểu 1 phút giữa các yêu cầu OTP')
                );
            }

            const OTP = generateOTP();
            user.OTP = OTP;
            user.OTPCreatedTime = currentTime;

            await user.save();

            sendOTP(email, OTP);
            console.log(OTP)
            res.status(200).json(formatResponseSuccessNoData(true, 'OTP sent successfully'));
        } catch (err) {
            console.log(err);
            res.status(500).send("Server error");
        }
    }

    async verifyOTP(req, res) {
        const email = req.body.email;
        const OTP = req.body.OTP;

        try {
            const user = await User.findOne({ email: email });

            if (!user) {
                return res.status(200).json(
                    formatResponseError({ code: '404' }, false, 'Email chưa được đăng kí')
                );
            }

            // Check if user account is blocked
            if (user.isBlocked) {
                const currentTime = new Date();
                if (currentTime < user.blockUntil) {
                    return res.status(200).json(
                        formatResponseError({ code: '404' }, false, 'Tài khoản bị khóa. Hãy thử sau một thời gian.')
                    );
                } else {
                    user.isBlocked = false;
                    user.OTPAttempts = 0;
                }
            }

            // Check OTP
            if (user.OTP !== OTP) {
                user.OTPAttempts++;

                // check quá 5 lần chặn ngươi fdungj 1 tiênts
                if (user.OTPAttempts >= 5) {
                    user.isBlocked = true;
                    let blockUntil = new Date();
                    blockUntil.setHours(blockUntil.getHours() + 1);
                    user.blockUntil = blockUntil;
                }

                await user.save();

                return res.status(200).json(
                    formatResponseError({ code: '404' }, false, 'OTP không hợp lệ')
                );
            }

            // Check if OTP is within 5 minutes
            const OTPCreatedTime = user.OTPCreatedTime;
            const currentTime = new Date();

            if (currentTime - OTPCreatedTime > 5 * 60 * 1000) {
                return res.status(200).json(
                    formatResponseError({ code: '404' }, false, 'OTP hết hạn')
                );
            }

            // Generate JWT
            // const token = jwt.sign({ email: user.email }, process.env.SECRET_KEY, {
            //     expiresIn: "1h",
            // });

            // Clear OTP
            user.OTP = undefined;
            user.OTPCreatedTime = undefined;
            user.OTPAttempts = 0;

            //update account
            user.verified = true

            await user.save();

            const accessToken = jwt.sign({ id: user.id }, config.secret, {
                // expiresIn: 86400 // 24 hours
            });

            console.log(accessToken);
            const data = {
                accessToken
            }

            res.status(200).json(formatResponseSuccess(data, true, 'Xác nhận thành công'));
            console.log("User logged in successfully");
        } catch (err) {
            console.log(err);
            res.status(500).send("Server error");
        }
    }

    async login(req, res) {
        try {
            const { key, iv, body } = req.body.data;

            console.log(req.body)
            const sessionKey = Buffer.from(rsa.decrypt(key), 'base64');
            const sessionIV = Buffer.from(rsa.decrypt(iv), 'base64');
            const {username , password} = JSON.parse(aes.decrypt(body, sessionKey, sessionIV));

            const filter = {};
            if (rules.email.test(username)) {
                filter.email = username;
            } else if (rules.phone.test(username)) {
                filter.phone = username;
            } else {
                return res.status(200).json(formatResponseError({ code: '404' }, false, 'invalid_username'));
            }

            const checkEmail = await User.findOne({ email: username });
            const checkPhone = await User.findOne({ phone: username });


            if (isGmail(username)) {
                if (!checkEmail) return res.status(200).json(
                    formatResponseError({ code: '404' }, false, 'Email chưa được đăng kí')
                );
            }

            if (isPhoneNumber(username)) {
                if (!checkPhone) return res.status(200).json(
                    formatResponseError({ code: '404' }, false, 'Số điện thoại chưa được đăng kí')
                );
            }

            const user = await User.findOne(filter).exec();

            const checkPass = bcyrpt.compareSync(password, user.password);

            if (!checkPass) return res.status(200).json(formatResponseError({ code: '404' }, false, 'Tài khoản hoặc mật khẩu không chính xác'));

            const accessToken = jwt.sign({ id: user.id }, config.secret, {
                // expiresIn: 86400 // 24 hours
            });

            if (user.verified) {
                const data = {
                    _id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    phone: user.phone,
                    tokenDevice: user.tokenDevice,
                    image: user.image,
                    accessToken,
                    verified: user.verified
                };

                return res.status(200).json(formatResponseSuccess(data, true, 'Đăng nhập thành công'));
            } else {
                res.status(200).json(formatResponseError({ code: '404', }, false, 'Tài khoản chưa xác thực hãy xác thực tài khoản', 1122));
            }
        } catch (error) {
            console.log(error);
            return res.status(200).json(formatResponseError({ code: '400' }, false, 'Lỗi đăng nhập'));
        }
    }


    async verifyToken(req, res, next) {
        let token = req.headers["x-access-token"];

        if (!token) {
            return res.status(403).send({ message: "No token provided!" });
        }

        jwt.verify(token, config.secret, (err, decoded) => {
            if (err) {
                return res.status(401).send({ message: "Unauthorized!" });
            }
            req.userId = decoded.id;
            next();
        });
    }

    async isModerator(req, res) {
        try {
            const user = await User.findById(req.userId);
            if (!user) {
                return res.status(404).json(formatResponseError(null, false, 'Người dùng không tồn tại'));
            }
            if (user.verified) {
                const data = {
                    _id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    phone: user.phone,
                    tokenDevice: user.tokenDevice,
                    image: user.image,
                    verified: user.verified
                };
                return res.status(200).json(formatResponseSuccess(data, true, 'Đăng nhập thành công'));
            } else {
                const data = {
                    verified: user.verified
                };
                return res.status(200).json(formatResponseSuccess(data, false, 'Tài khoản chưa xác thực'));
            }
        } catch (error) {
            return res.status(500).json(formatResponseError(null, false, 'Lỗi server'));
        }
    }

    async moderatorBoard(req, res) {
        res.status(200).send("User Content.");
    }
}



function isPhoneNumber(input) {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(input);
}

function isGmail(input) {
    const gmailRegex = /^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/;
    return gmailRegex.test(input);
}

function hashString(input, algorithm) {
    const bytes = Buffer.from(input, 'utf-8');
    const hash = crypto.createHash(algorithm).update(bytes).digest('hex');
    return hash;
}

const algorithm = 'aes-256-cbc';
const key = 'REtgV24bDB7xQYoMuypiBASMEaJbc59n';
const iv = '8d2bc3f0f69426fc';

const encrypt = (data) => {
    const cipher = createCipheriv(algorithm, key, iv);
    let crypted = cipher.update(data, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
};

const decrypt = (data) => {
    const decipher = createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

const decrypt2 = (data) => {
    var decipher = crypto.createDecipher('aes-128-ecb', key);

    var chunks = []
    chunks.push(decipher.update(new Buffer(data, "base64").toString("binary")));
    chunks.push(decipher.final('binary'));
    var txt = chunks.join("");
    txt = new Buffer(txt, "binary").toString("utf-8");
};



export default new Auth();
