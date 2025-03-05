
import User from '../models/user';
import { formatResponseError, formatResponseSuccess, formatResponseSuccessNoData } from '../config';
const config = require('../config/auth.config');
const bcyrpt = require('bcrypt');
import { rules } from '../constants/rules';
import album from '../models/album';
import song from '../models/song';
const jwt = require('jsonwebtoken');
const { generateOTP, sendOTP } = require("../util/otp");
const encrypt = require('../../build/Release/addon');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const TYPE_OTP_LOGIN = "LOGIN"

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed!'), false);
    }
};
const upload = multer({ storage, fileFilter });

class Auth {
    async testLogin(req, res) {
        try {
            console.log("tool encrypt data")
            // const text = "{\"email\" : \"quanvd31102002@gmail.com\" , \"password\" : \"quan3110\"}"
            const text = "{\"email\" : \"dinhthanhminhk11@gmail.com\"}"
            let textEncrpyt = encrypt.encryptData(text)

            let textDecrypt = encrypt.decryptData(textEncrpyt)

            try {
                const { email, password } = JSON.parse(textDecrypt);



                const user = await User.findOne({ email }).lean();
                const accessToken = "xyz123token"

                const text = formatUserData(user, accessToken)

                console.log(encrypt.encryptData(text));



                return res.status(200).json({
                    "textEncrpyt": textEncrpyt
                })
            } catch (error) {
                return res.status(404).json({
                    "textEncrpyt": "❌ Dữ liệu không phải JSON hợp lệ"
                })
            }

        } catch (error) {
            console.log('register', error);
            return res.status(400).json(formatResponseError({ code: '404' }, false, 'Lỗi đăng kí'));
        }
    }

    async register(req, res) {
        try {
            console.log("=========================================");
            console.log("Call register");

            const { data } = req.body;
            if (!data) {
                return res.status(400).json(formatResponseError("DATA_MISSING", "Missing request data"));
            }

            let decryptedData;
            try {
                decryptedData = JSON.parse(encrypt.decryptData(data));
            } catch (err) {
                return res.status(400).json(formatResponseError("DATA_NOT_DECRYPT", "Invalid decrypted data format"));
            }

            const { email } = decryptedData;

            if (!isGmail(email)) {
                return res.status(400).json(formatResponseError("EMAIL_NOT_FORMAT", "Not a valid Gmail address"));
            }

            const exist_email = await User.findOne({ email }).lean();

            if (exist_email) {
                return res.status(409).json(formatResponseError("EMAIL_ALREADY_EXISTS", "Email already exists"));
            }

            const OTP = generateOTP();
            const user = new User({ email, OTP });
            await user.save();

            sendOTP(email, OTP);
            console.log("OTP sent:", OTP);

            return res.status(200).json(formatResponseSuccess(
                "USER_REGISTER_SUCCESS",
                "User registered successfully.",
                { verified: user.verified }
            ));

        } catch (error) {
            console.error("Register Error:", error);
            return res.status(500).json(formatResponseError("SERVER_ERROR", "Internal Server Error"));
        }
    }

    async gennerateOTP(req, res) {
        try {
            console.log("=========================================");
            console.log("Call gennerateOTP");

            const { data } = req.body;

            if (!data) {
                return res.status(400).json(formatResponseError("DATA_MISSING", "Missing request data"));
            }

            let decryptedData;
            try {
                decryptedData = JSON.parse(encrypt.decryptData(data));
            } catch (err) {
                return res.status(400).json(formatResponseError("DATA_NOT_DECRYPT", "Invalid decrypted data format"));
            }

            const { email, type } = decryptedData;

            if (!isGmail(email)) {
                return res.status(400).json(formatResponseError("EMAIL_NOT_FORMAT", "Not a valid Gmail address"));
            }

            const user = await User.findOne({ email }).lean();

            if (!user) {
                return res.status(409).json(formatResponseError("EMAIL_DOSE_NOT_EXISTS", "Email does not exist"));
            }

            if (user.isBlocked) {
                const currentTime = new Date();
                if (currentTime < user.blockUntil) {
                    return res.status(409).json(formatResponseError("ACCOUNT_LOCKED", "Account locked. Try it after a while."));
                } else {
                    user.isBlocked = false;
                    user.OTPAttempts = 0;
                }
            }

            const lastOTPTime = user.OTPCreatedTime;
            const currentTime = new Date();

            if (lastOTPTime && currentTime - lastOTPTime < 60000) {
                return res.status(409).json(formatResponseError("OTP_LIMIT", "Requires a minimum of 1 minute interval between OTP requests"));
            }

            const OTP = generateOTP();
            user.OTP = OTP;
            user.OTPCreatedTime = currentTime;

            await user.save();

            sendOTP(email, OTP);
            console.log(OTP)
            console.log("OTP sent successfully");
            return res.status(200).json(formatResponseSuccess(
                "OTP_RECENT_SUCCESS",
                "OTP sent successfully."
            ));
        } catch (err) {
            console.log(err);
            res.status(500).send("Server error");
        }
    }

    async verifyOTP(req, res) {
        try {
            console.log("=========================================");
            console.log("Call verifyOTP");

            const { data } = req.body;
            if (!data) {
                return res.status(400).json(formatResponseError("DATA_MISSING", "Missing request data"));
            }

            let decryptedData;
            try {
                decryptedData = JSON.parse(encrypt.decryptData(data));
            } catch (err) {
                return res.status(400).json(formatResponseError("DATA_NOT_DECRYPT", "Invalid decrypted data format"));
            }

            const { email, otp, type } = decryptedData;

            console.log('verifyOTP', req.body.data);

            if (!isGmail(email)) {
                return res.status(400).json(formatResponseError("EMAIL_NOT_FORMAT", "Not a valid Gmail address"));
            }

            const user = await User.findOne({ email }).lean();

            if (!user) {
                return res.status(409).json(formatResponseError("EMAIL_DOSE_NOT_EXISTS", "Email does not exist"));
            }

            if (user.isBlocked) {
                const currentTime = new Date();
                if (currentTime < user.blockUntil) {
                    return res.status(409).json(formatResponseError("ACCOUNT_LOCKED", "Account locked. Try it after a while."));
                } else {
                    user.isBlocked = false;
                    user.OTPAttempts = 0;
                }
            }

            if (user.OTP !== otp) {
                user.OTPAttempts++;
                if (user.OTPAttempts >= 5) {
                    user.isBlocked = true;
                    let blockUntil = new Date();
                    blockUntil.setHours(blockUntil.getHours() + 1);
                    user.blockUntil = blockUntil;
                }

                await user.save();
                return res.status(409).json(formatResponseError("OTP_NOT_VALID", "OTP is not valid."));
            }

            const OTPCreatedTime = user.OTPCreatedTime;
            const currentTime = new Date();

            if (currentTime - OTPCreatedTime > 5 * 60 * 1000) {
                return res.status(409).json(formatResponseError("OTP_EXPIRED", "OTP expired"));
            }

            user.OTP = undefined;
            user.OTPCreatedTime = undefined;
            user.OTPAttempts = 0;

            user.verified = true

            await user.save();

            if (type == TYPE_OTP_LOGIN) {
                const accessToken = jwt.sign({ id: user.id }, config.secret, {
                    // expiresIn: 86400 // 24 hours
                });

                console.log(accessToken);

                const text = formatUserData(user, accessToken)

                const dataResponse = {
                    "data": encrypt.encryptData(text)
                }
                console.log("User logged in successfully");
                return res.status(200).json(formatResponseSuccess(
                    "LOGIN_SUCCESS",
                    "Login successful.",
                    dataResponse
                ));
            } else {
                console.log("Confirmed successfully");
                return res.status(200).json(formatResponseSuccess(
                    "OTP_CONFIRMED",
                    "Confirmed successfully",
                    {
                        "type": type
                    }
                ));
            }
        } catch (err) {
            console.log(err);
            res.status(500).send("Server error");
        }
    }



    async loginWithOtp(req, res) {
        try {
            console.log("=========================================");
            console.log("Call loginWithOtp");

            const { data } = req.body;
            if (!data) {
                return res.status(400).json(formatResponseError("DATA_MISSING", "Missing request data"));
            }

            let decryptedData;
            try {
                decryptedData = JSON.parse(encrypt.decryptData(data));
            } catch (err) {
                return res.status(400).json(formatResponseError("DATA_NOT_DECRYPT", "Invalid decrypted data format"));
            }

            const { email } = decryptedData;

            if (!isGmail(email)) {
                return res.status(400).json(formatResponseError("EMAIL_NOT_FORMAT", "Not a valid Gmail address"));
            }

            const user = await User.findOne({ email }).lean();

            if (!user) {
                return res.status(409).json(formatResponseError("EMAIL_DOSE_NOT_EXISTS", "Email does not exist"));
            }

            if (user.isBlocked) {
                return res.status(409).json(formatResponseError("ACCOUNT_LOCKED", "Account locked. Try it after a while."));
            }

            const OTP = generateOTP();
            user.OTP = OTP;
            user.OTPAttempts++;
            if (user.OTPAttempts >= 5) {
                user.isBlocked = true;
                let blockUntil = new Date();
                blockUntil.setHours(blockUntil.getHours() + 1);
                user.blockUntil = blockUntil;
            }
            await user.save();
            sendOTP(username, OTP);
            console.log(OTP)
            if (user.verified) {
                console.log("Authenticated accounts can log in")
                return res.status(200).json(formatResponseSuccess(
                    "ACCOUNT_CAN_LOGIN",
                    "Authenticated accounts can log in"
                ));
            } else {
                console.log("Unverified accounts require authentication")
                return res.status(200).json(formatResponseSuccess(
                    "ACCOUNT_CAN_NOT_LOGIN",
                    "Unverified accounts require authentication"
                ));
            }

        } catch (error) {
            console.error("Register Error:", error);
            return res.status(500).json(formatResponseError("SERVER_ERROR", "Internal Server Error"));
        }
    }

    async loginWithPass(req, res) {
        try {
            console.log("=========================================");
            console.log("Call loginWithPass");

            const { data } = req.body;
            if (!data) {
                return res.status(400).json(formatResponseError("DATA_MISSING", "Missing request data"));
            }

            let decryptedData;
            try {
                decryptedData = JSON.parse(encrypt.decryptData(data));
            } catch (err) {
                return res.status(400).json(formatResponseError("DATA_NOT_DECRYPT", "Invalid decrypted data format"));
            }

            const { email, password } = decryptedData;

            if (!isGmail(email)) {
                return res.status(400).json(formatResponseError("EMAIL_NOT_FORMAT", "Not a valid Gmail address"));
            }

            const user = await User.findOne({ email }).lean();

            if (!user) {
                return res.status(409).json(formatResponseError("EMAIL_DOSE_NOT_EXISTS", "Email does not exist"));
            }

            if (user.isBlocked) {
                return res.status(409).json(formatResponseError("ACCOUNT_LOCKED", "Account locked. Try it after a while."));
            }

            const checkPass = bcyrpt.compareSync(password, user.password);

            if (checkPass) {
                const accessToken = jwt.sign({ id: user.id }, config.secret, {
                    // expiresIn: 86400 // 24 hours
                });

                console.log(accessToken);

                const text = formatUserData(user, accessToken)

                const dataResponse = {
                    "data": encrypt.encryptData(text)
                }
                console.log("User logged in successfully");
                return res.status(200).json(formatResponseSuccess(
                    "LOGIN_SUCCESS",
                    "Login successful.",
                    dataResponse
                ));
            } else {
                return res.status(409).json(formatResponseError("LOGIN_ERROR", "Account or password is incorrect"));
            }

        } catch (error) {
            console.error("loginWithPass Error:", error);
            return res.status(500).json(formatResponseError("SERVER_ERROR", "Internal Server Error"));
        }
    }

    async setPassWord(req, res) {
        try {
            console.log("=========================================");
            console.log("Call setPassWord");

            const { data } = req.body;
            if (!data) {
                return res.status(400).json(formatResponseError("DATA_MISSING", "Missing request data"));
            }

            let decryptedData;
            try {
                decryptedData = JSON.parse(encrypt.decryptData(data));
            } catch (err) {
                return res.status(400).json(formatResponseError("DATA_NOT_DECRYPT", "Invalid decrypted data format"));
            }

            const { email, password } = decryptedData;

            if (!isGmail(email)) {
                return res.status(400).json(formatResponseError("EMAIL_NOT_FORMAT", "Not a valid Gmail address"));
            }

            const user = await User.findOne({ email }).lean();

            if (!user) {
                return res.status(409).json(formatResponseError("EMAIL_DOSE_NOT_EXISTS", "Email does not exist"));
            }

            user.verified = true
            user.password = bcyrpt.hashSync(password, 10)
            await user.save();
            console.log("User logged in successfully");
            return res.status(200).json(formatResponseSuccess(
                "SETPASS_SUCCESS",
                "Set passs successful."
            ));

        } catch (error) {
            console.error("setPassWord Error:", error);
            return res.status(500).json(formatResponseError("SERVER_ERROR", "Internal Server Error"));
        }
    }

    async verifyToken(req, res, next) {
        let token = req.headers["x-access-token"];
        console.log(token);
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
                    verified: user.verified,
                    imageBanner: user.imageBanner
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

    async updateUser(req, res) {
        try {
            upload.fields([
                { name: 'image', maxCount: 1 },
                { name: 'imageBanner', maxCount: 1 }
            ])(req, res, async (err) => {
                console.log(req.body.email)
                const user = await User.findOne({ email: req.body.email });

                if (!user) {
                    return res.status(404).json(formatResponseError({ code: '404' }, false, 'Người dùng không tồn tại'));
                }

                if (req.files && req.files['image']) {
                    const oldImagePath = `./uploads/${user.image}`;
                    if (user.image) {
                        try {
                            await unlinkFile(oldImagePath);
                        } catch (error) {
                            console.log('Lỗi khi xóa hình ảnh cũ:', error);
                        }
                    }
                    user.image = req.files['image'][0].filename;
                }

                if (req.files && req.files['imageBanner']) {
                    const oldImageBannerPath = `./uploads/${user.imageBanner}`;
                    if (user.imageBanner) {
                        try {
                            await unlinkFile(oldImageBannerPath);
                        } catch (error) {
                            console.log('Lỗi khi xóa hình ảnh banner cũ:', error);
                        }
                    }
                    user.imageBanner = req.files['imageBanner'][0].filename;
                }

                if (req.body.fullName) {
                    user.fullName = req.body.fullName;
                }

                const updatedUser = await user.save();
                const data = {
                    fullName: updatedUser.fullName,
                    image: req.files && req.files['image'] ? req.files['image'][0].filename : user.image,
                    imageBanner: req.files && req.files['imageBanner'] ? req.files['imageBanner'][0].filename : user.imageBanner,
                };

                res.status(200).json(formatResponseSuccess(data, true, 'Cập nhật thành công'));
            });
        } catch (error) {
            console.log(error);
            return res.status(500).json(formatResponseError({ code: '500' }, false, 'Lỗi máy chủ'));
        }
    }

    async getArtistAndAlbumAndSongByArtistId(req, res) {
        try {
            const idArtist = req.params.id;
            const dataArtist = await User.findById(idArtist)
            const albums = await album.find({ artistIdString: idArtist }).lean()
            const albumIds = albums.map(album => album._id);
            const songs = await song.find({ albumIdString: { $in: albumIds } }).lean();

            const songsByAlbum = {};
            songs.forEach(song => {
                if (!songsByAlbum[song.albumIdString]) {
                    songsByAlbum[song.albumIdString] = [];
                }
                songsByAlbum[song.albumIdString].push(song);
            });

            albums.forEach(album => {
                album.songs = songsByAlbum[album._id] || [];
            });

            res.status(200).json({ id: Date.now(), image: dataArtist.image, albums: albums, isAlbumArtist: true });

        } catch (error) {
            console.log(error)
            return res.status(500).json(formatResponseError(null, false, 'Lỗi server'));
        }
    }

    async getAllArtist(req, res) {
        try {
            const users = await User.find({}, { _id: 1, image: 1, image: 1 });
        } catch (error) {
            console.log(error)
            return res.status(500).json(formatResponseError(null, false, 'Lỗi server'));
        }
    }
}

function isGmail(input) {
    const gmailRegex = /^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/;
    return gmailRegex.test(input);
}

const formatUserData = (user, accessToken) => {
    const filteredUser = {
        id: user._id,
        fullName: user.fullName,
        image: user.image,
        imageBanner: user.imageBanner,
        phone: user.phone,
        email: user.email,
        accessToken: accessToken
    };

    const cleanedUser = Object.fromEntries(
        Object.entries(filteredUser).filter(([_, value]) => value !== null && value !== undefined && value !== "")
    );

    return JSON.stringify(cleanedUser, null, 2);
};

export default new Auth();
