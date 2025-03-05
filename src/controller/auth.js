
import User from '../models/user';
import { formatResponseError, formatResponseSuccess, formatResponseSuccessNoData } from '../config';
const config = require('../config/auth.config');
const bcrypt = require('bcrypt');
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
    
            if (!email || typeof email !== "string") {
                return res.status(400).json(formatResponseError("EMAIL_MISSING", "Email is required"));
            }
    
            if (!isGmail(email)) {
                return res.status(400).json(formatResponseError("EMAIL_NOT_FORMAT", "Not a valid Gmail address"));
            }
    
            const exist_email = await User.findOne({ email });
            if (exist_email) {
                return res.status(409).json(formatResponseError("EMAIL_ALREADY_EXISTS", "Email already exists"));
            }
    
            const OTP = generateOTP();
            const hashedOTP = bcrypt.hashSync(OTP, 10);
            const user = new User({ email, OTP: hashedOTP });
    
            await user.save();
            console.log("OTP sent:", OTP);
            try {
                await sendOTP(email, OTP);
            } catch (err) {
                return res.status(500).json(formatResponseError("OTP_SEND_FAIL", "Failed to send OTP"));
            }
    
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

            if (user.isBlocked && currentTime < user.blockUntil) {
                return res.status(409).json(formatResponseError("ACCOUNT_LOCKED", "Account locked. Try it after a while."));
            }

            if (user.OTPCreatedTime && (currentTime.getTime() - user.OTPCreatedTime.getTime() < 60000)) {
                return res.status(409).json(formatResponseError("OTP_LIMIT", "Requires a minimum of 1 minute interval between OTP requests"));
            }

            const OTP = generateOTP();
            await User.updateOne(
                { email },
                {
                    $set: {
                        OTP,
                        OTPCreatedTime: currentTime,
                        ...(user.isBlocked ? { isBlocked: false, OTPAttempts: 0 } : {})
                    }
                }
            );

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
    
            const currentTime = new Date();
            const user = await User.findOneAndUpdate(
                { email },
                {
                    $set: { 
                        ...(currentTime >= user?.blockUntil ? { isBlocked: false, OTPAttempts: 0 } : {}) 
                    }
                },
                { new: true }
            );
    
            if (!user) {
                return res.status(409).json(formatResponseError("EMAIL_DOSE_NOT_EXISTS", "Email does not exist"));
            }
    
            if (user.isBlocked && currentTime < user.blockUntil) {
                return res.status(409).json(formatResponseError("ACCOUNT_LOCKED", "Account locked. Try again later."));
            }

            const checkOTP = bcrypt.compareSync(otp, user.OTP);

    
            if (!checkOTP) {
                const updateData = { $inc: { OTPAttempts: 1 } };
    
                if (user.OTPAttempts + 1 >= 5) {
                    updateData.$set = {
                        isBlocked: true,
                        blockUntil: new Date(currentTime.getTime() + 60 * 60 * 1000)
                    };
                }
    
                await User.updateOne({ email }, updateData);
                return res.status(409).json(formatResponseError("OTP_NOT_VALID", "OTP is not valid."));
            }
    
            if (user.OTPCreatedTime && (currentTime - user.OTPCreatedTime > 5 * 60 * 1000)) {
                return res.status(409).json(formatResponseError("OTP_EXPIRED", "OTP expired"));
            }
    
            const updatedUser = await User.findOneAndUpdate(
                { email },
                { 
                    $unset: { OTP: "", OTPCreatedTime: "" },
                    $set: { verified: true, OTPAttempts: 0 }
                },
                { new: true }
            );
    
            if (type === TYPE_OTP_LOGIN) {
                const accessToken = jwt.sign({ id: updatedUser.id }, config.secret);
                const text = formatUserData(updatedUser, accessToken);
                return res.status(200).json(formatResponseSuccess(
                    "LOGIN_SUCCESS",
                    "Login successful.",
                    { "data": encrypt.encryptData(text) }
                ));
            } else {
                return res.status(200).json(formatResponseSuccess(
                    "OTP_CONFIRMED",
                    "Confirmed successfully",
                    { "type": type }
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
    
            const currentTime = new Date();
    
            // Lấy user và cập nhật nếu cần thiết
            const user = await User.findOneAndUpdate(
                { email },
                {
                    $set: {
                        ...(currentTime >= user?.blockUntil ? { isBlocked: false, OTPAttempts: 0 } : {}) 
                    }
                },
                { new: true }
            );
    
            if (!user) {
                return res.status(409).json(formatResponseError("EMAIL_DOSE_NOT_EXISTS", "Email does not exist"));
            }
    
            if (user.isBlocked && currentTime < user.blockUntil) {
                console.log(`Account is locked until ${user.blockUntil}`);
                return res.status(409).json(formatResponseError("ACCOUNT_LOCKED", "Account locked. Try again later."));
            }
    
            if (user.OTPCreatedTime && (currentTime - user.OTPCreatedTime < 60000)) {
                return res.status(409).json(formatResponseError("OTP_LIMIT", "Requires a minimum of 1 minute interval between OTP requests"));
            }
    
            const OTP = generateOTP();
            console.log(`Generated OTP for ${email}: ${OTP}`);
    
            const updateData = {
                $set: {
                    OTP,
                    OTPCreatedTime: currentTime
                },
                $inc: { OTPAttempts: 1 }
            };
    
            if (user.OTPAttempts + 1 >= 5) {
                updateData.$set.isBlocked = true;
                updateData.$set.blockUntil = new Date(currentTime.getTime() + 60 * 60 * 1000); 
            }
    
            await User.updateOne({ email }, updateData);
    
            sendOTP(email, OTP);
    
            console.log(user.verified ? "Authenticated accounts can log in" : "Unverified accounts require authentication");
    
            return res.status(200).json(formatResponseSuccess(
                user.verified ? "ACCOUNT_CAN_LOGIN" : "ACCOUNT_CAN_NOT_LOGIN",
                user.verified ? "Authenticated accounts can log in" : "Unverified accounts require authentication"
            ));
    
        } catch (error) {
            console.error("LoginWithOtp Error:", error);
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
    
            const currentTime = new Date();
    
            const user = await User.findOneAndUpdate(
                { email },
                {
                    $set: {
                        ...(currentTime >= user?.blockUntil ? { isBlocked: false, loginAttempts: 0 } : {})
                    }
                },
                { new: true }
            );
    
            if (!user) {
                return res.status(409).json(formatResponseError("EMAIL_DOSE_NOT_EXISTS", "Email does not exist"));
            }
    
            if (user.isBlocked && currentTime < user.blockUntil) {
                console.log(`Account is locked until ${user.blockUntil}`);
                return res.status(409).json(formatResponseError("ACCOUNT_LOCKED", "Account locked. Try again later."));
            }
    
            if (!user.password) {
                return res.status(409).json(formatResponseError("PASSWORD_NOT_SET", "Password is not set for this account"));
            }
    
            const checkPass = bcrypt.compareSync(password, user.password);
    
            if (!checkPass) {
                const updateData = { $inc: { loginAttempts: 1 } };
    
                if (user.loginAttempts + 1 >= 5) {
                    updateData.$set = {
                        isBlocked: true,
                        blockUntil: new Date(currentTime.getTime() + 60 * 60 * 1000) 
                    };
                    console.log(`Account ${email} is locked due to multiple failed login attempts.`);
                }
    
                await User.updateOne({ email }, updateData);
                return res.status(409).json(formatResponseError("LOGIN_ERROR", "Account or password is incorrect"));
            }
    
            await User.updateOne({ email }, { $set: { loginAttempts: 0 } });
    
            const accessToken = jwt.sign({ id: user.id }, config.secret);
    
            console.log(`User ${email} logged in successfully`);
    
            const text = formatUserData(user, accessToken);
            const dataResponse = { "data": encrypt.encryptData(text) };
    
            return res.status(200).json(formatResponseSuccess(
                "LOGIN_SUCCESS",
                "Login successful.",
                dataResponse
            ));
    
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
    
            const user = await User.findOne({ email }); 
    
            if (!user) {
                return res.status(409).json(formatResponseError("EMAIL_DOES_NOT_EXIST", "Email does not exist"));
            }

            if (!user.verified) {
                return res.status(403).json(formatResponseError("OTP_NOT_VERIFIED", "Please verify OTP before setting password"));
            }
    
            user.verified = true;
            user.password = bcrypt.hashSync(password, 10);
            await user.save(); 
    
            console.log("Password set successfully");
            return res.status(200).json(formatResponseSuccess(
                "SETPASS_SUCCESS",
                "Set password successful."
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

const setUserData = async (email, data) => {
    await User.updateOne({ email }, { $set: data });
};

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
