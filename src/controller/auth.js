
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

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed!'), false);
    }
};
const upload = multer({ storage, fileFilter });

class Auth {
    async register(req, res) {
        try {
            const dataRes = req.body.data.input;
            const { email, phone, password, tokenDevice, fullName } = JSON.parse(encrypt.decryptData(dataRes));

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
            console.log(OTP);
            const data = {
                verified: user.verified
            };
            return res.status(200).json(formatResponseSuccess(data, true, 'Đăng kí thành công'));
        } catch (error) {
            console.log('register', error);
            return res.status(400).json(formatResponseError({ code: '404' }, false, 'Lỗi đăng kí'));
        }
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

    async gennerateOTP(req, res) {
        const dataRes = req.body.data;
        console.log(dataRes)
        const { email } = dataRes;
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
        const dataRes = req.body.data;
        console.log(dataRes)

        const { email, OTP } = dataRes;
        console.log('verifyOTP', req.body.data);
        try {
            const user = await User.findOne({ email: email });

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
            const dataRes = req.body.data.input;
            console.log(dataRes)
            const { username, password } = JSON.parse(encrypt.decryptData(dataRes));
            console.log(username)

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
                    verified: user.verified,
                    imageBanner: user.imageBanner
                };

                console.log(data)

                return res.status(200).json(formatResponseSuccess(data, true, 'Đăng nhập thành công'));
            } else {
                const OTP = generateOTP();
                user.OTP = OTP;
                await user.save();
                sendOTP(username, OTP);
                res.status(200).json(formatResponseError({ code: '404', }, false, 'Tài khoản chưa xác thực hãy xác thực tài khoản', 1122));
            }
        } catch (error) {
            console.log(error);
            return res.status(200).json(formatResponseError({ code: '400' }, false, 'Lỗi đăng nhập'));
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



function isPhoneNumber(input) {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(input);
}

function isGmail(input) {
    const gmailRegex = /^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/;
    return gmailRegex.test(input);
}

export default new Auth();
