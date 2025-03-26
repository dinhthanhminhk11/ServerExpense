import protobuf from "protobufjs";
const path = require('path');
import User from '../models/user';
const root = protobuf.loadSync(path.join(__dirname, "../../proto/auth.proto"));
const ErrorResponse = root.lookupType("ErrorResponse");
const Constants = require('../util/constants')
const checkEmailNotExists = async (req, res, next) => {
    const { email } = req.decryptedData;
    const existEmail = await User.findOne({ email, role: { $in: [0, 1] } });
    if (!existEmail) {
        return res.status(409).send(ErrorResponse.encode({
            success: false,
            error: {
                code: Constants.EMAIL_DOSE_NOT_EXISTS,
                message: "Email does not exist"
            }
        }).finish());
    }

    req.user = existEmail
    next();
};

export default checkEmailNotExists;